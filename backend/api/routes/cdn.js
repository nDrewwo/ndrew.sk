const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const authenticateToken = require('../middleware/authenticateToken');
const { resolveSafePath, sanitizeFilename, parseChunkIndex, asyncHandler, HttpError } = require('../utils/routeSafety');
const { uploadSessions } = require('../utils/uploadSessions');

const router = express.Router();

const PUBLIC_DIR = path.join(__dirname, '../../cdn/public');

const galleryCache = { data: null, ts: 0 };
const GALLERY_CACHE_TTL = 60 * 1000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, PUBLIC_DIR);
  },
  filename: (req, file, cb) => {
    try {
      cb(null, `temp_${Date.now()}_${sanitizeFilename(file.originalname)}`);
    } catch (err) {
      cb(err);
    }
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 700 * 1024 * 1024 // 700MB limit
  }
});

// Get directory contents
router.get('/cdn/browse', authenticateToken, asyncHandler(async (req, res) => {
  const requestedPath = req.query.path || '';
  const fullPath = resolveSafePath(PUBLIC_DIR, requestedPath);

  let stats;
  try {
    stats = await fs.stat(fullPath);
  } catch (error) {
    throw new HttpError(404, 'Path not found');
  }

  if (stats.isDirectory()) {
    const items = await fs.readdir(fullPath);
    const itemDetails = await Promise.all(
      items.map(async (item) => {
        const itemPath = path.join(fullPath, item);
        const itemStats = await fs.stat(itemPath);
        return {
          name: item,
          path: path.join(requestedPath, item).replace(/\\/g, '/'),
          type: itemStats.isDirectory() ? 'directory' : 'file',
          size: itemStats.isDirectory() ? null : itemStats.size,
          modified: itemStats.mtime.toISOString()
        };
      })
    );

    // Sort directories first, then files
    itemDetails.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    res.json({
      currentPath: requestedPath,
      items: itemDetails
    });
  } else {
    res.json({
      name: path.basename(fullPath),
      path: requestedPath,
      type: 'file',
      size: stats.size,
      modified: stats.mtime.toISOString()
    });
  }
}));

// Create new folder
router.post('/cdn/create-folder', authenticateToken, asyncHandler(async (req, res) => {
  const { path: requestedPath, folderName } = req.body;

  if (!folderName) {
    throw new HttpError(400, 'Folder name is required');
  }

  // Sanitize folder name
  const sanitizedName = folderName.replace(/[<>:"/\\|?*]/g, '').trim();
  if (!sanitizedName || sanitizedName === '.' || sanitizedName === '..') {
    throw new HttpError(400, 'Invalid folder name');
  }

  const newFolderPath = resolveSafePath(PUBLIC_DIR, requestedPath || '', sanitizedName);

  // Check if folder already exists
  try {
    await fs.access(newFolderPath);
    throw new HttpError(409, 'Folder already exists');
  } catch (e) {
    if (e instanceof HttpError) throw e;
    // Folder doesn't exist, we can create it
  }

  await fs.mkdir(newFolderPath, { recursive: true });
  res.json({
    success: true,
    message: 'Folder created successfully',
    folderName: sanitizedName
  });
}));

// Initialize chunked upload
router.post('/cdn/upload-init', authenticateToken, asyncHandler(async (req, res) => {
  const { fileName, fileSize, totalChunks, path: uploadPath } = req.body;

  if (!fileName || !fileSize || !totalChunks) {
    throw new HttpError(400, 'Missing required parameters');
  }

  // Generate unique upload ID
  const uploadId = `${Date.now()}_${Math.random().toString(36).substring(2)}`;

  uploadSessions.set(uploadId, {
    fileName,
    fileSize,
    totalChunks,
    uploadPath: uploadPath || '',
    uploadedChunks: new Set(),
    createdAt: Date.now()
  });

  res.json({ uploadId, message: 'Upload session initialized' });
}));

// Upload individual chunk
router.post('/cdn/upload-chunk', authenticateToken, (req, res, next) => {
  upload.single('chunk')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Chunk too large' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Server error: ${err.message}` });
    }
    next();
  });
}, asyncHandler(async (req, res) => {
  const { uploadId, chunkIndex } = req.body;
  const chunkFile = req.file;

  if (!uploadId || chunkIndex === undefined || !chunkFile) {
    await fs.unlink(chunkFile?.path).catch(() => {});
    throw new HttpError(400, 'Missing required parameters');
  }

  const session = uploadSessions.get(uploadId);

  if (!session) {
    await fs.unlink(chunkFile.path).catch(() => {});
    throw new HttpError(404, 'Upload session not found');
  }

  let index;
  try {
    index = parseChunkIndex(chunkIndex, session.totalChunks);
  } catch (err) {
    await fs.unlink(chunkFile.path).catch(() => {});
    throw err;
  }

  // Create chunks directory
  const chunksDir = path.join(PUBLIC_DIR, 'temp_chunks', uploadId);
  await fs.mkdir(chunksDir, { recursive: true });

  // Move chunk to chunks directory
  const chunkPath = path.join(chunksDir, `chunk_${index}`);
  await fs.rename(chunkFile.path, chunkPath);

  // Track uploaded chunk
  session.uploadedChunks.add(index);

  res.json({
    message: 'Chunk uploaded successfully',
    uploadedChunks: session.uploadedChunks.size,
    totalChunks: session.totalChunks
  });
}));

// Finalize chunked upload
router.post('/cdn/upload-finalize', authenticateToken, asyncHandler(async (req, res) => {
  const { uploadId } = req.body;

  const session = uploadSessions.get(uploadId);

  if (!session) {
    throw new HttpError(404, 'Upload session not found');
  }

  // Check if all chunks are uploaded
  if (session.uploadedChunks.size !== session.totalChunks) {
    throw new HttpError(400, 'Missing chunks');
  }

  const safeFileName = sanitizeFilename(session.fileName);
  const chunksDir = path.join(PUBLIC_DIR, 'temp_chunks', uploadId);
  const targetDir = resolveSafePath(PUBLIC_DIR, session.uploadPath);
  const finalFilePath = path.join(targetDir, safeFileName);

  // Ensure target directory exists
  await fs.mkdir(targetDir, { recursive: true });

  // Combine chunks into final file using streams for memory efficiency
  await new Promise((resolve, reject) => {
    const writeStream = fsSync.createWriteStream(finalFilePath);

    writeStream.on('error', reject);
    writeStream.on('finish', resolve);

    const writeNextChunk = async (chunkIndex) => {
      if (chunkIndex >= session.totalChunks) {
        writeStream.end();
        return;
      }

      const chunkPath = path.join(chunksDir, `chunk_${chunkIndex}`);
      try {
        const readStream = fsSync.createReadStream(chunkPath);
        readStream.on('end', () => writeNextChunk(chunkIndex + 1));
        readStream.on('error', reject);
        readStream.pipe(writeStream, { end: false });
      } catch (error) {
        reject(error);
      }
    };

    writeNextChunk(0);
  });

  // Clean up chunks directory
  await fs.rm(chunksDir, { recursive: true, force: true });

  // Remove session
  uploadSessions.delete(uploadId);

  res.json({
    success: true,
    message: 'File uploaded successfully',
    fileName: safeFileName,
    size: session.fileSize
  });
}));

// Upload file
router.post('/cdn/upload', authenticateToken, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 700MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Server error: ${err.message}` });
    }
    next();
  });
}, asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new HttpError(400, 'No file uploaded');
  }

  const uploadPath = req.body.path || '';
  const tempFilePath = req.file.path;

  let targetDir, safeFileName;
  try {
    targetDir = resolveSafePath(PUBLIC_DIR, uploadPath);
    safeFileName = sanitizeFilename(req.file.originalname);
  } catch (err) {
    await fs.unlink(tempFilePath).catch(() => {});
    throw err;
  }

  const finalFilePath = path.join(targetDir, safeFileName);

  // Ensure target directory exists
  await fs.mkdir(targetDir, { recursive: true });

  // Move file from temp location to final location
  await fs.rename(tempFilePath, finalFilePath);

  res.json({
    success: true,
    message: 'File uploaded successfully',
    fileName: safeFileName,
    size: req.file.size
  });
}));

// Delete file or directory
router.delete('/cdn/delete', authenticateToken, asyncHandler(async (req, res) => {
  const { path: requestedPath, type } = req.body;

  if (!requestedPath) {
    throw new HttpError(400, 'Path is required');
  }

  const fullPath = resolveSafePath(PUBLIC_DIR, requestedPath);

  // Prevent deletion of root directory
  if (fullPath === PUBLIC_DIR) {
    throw new HttpError(403, 'Cannot delete root directory');
  }

  let stats;
  try {
    stats = await fs.stat(fullPath);
  } catch (error) {
    if (error.code === 'ENOENT') throw new HttpError(404, 'File or directory not found');
    throw error;
  }

  if (type === 'directory' && stats.isDirectory()) {
    try {
      await fs.rm(fullPath, { recursive: true, force: true });
    } catch (error) {
      if (error.code === 'ENOTEMPTY') throw new HttpError(400, 'Directory not empty');
      throw error;
    }
    res.json({ success: true, message: 'Directory deleted successfully' });
  } else if (type === 'file' && stats.isFile()) {
    await fs.unlink(fullPath);
    res.json({ success: true, message: 'File deleted successfully' });
  } else {
    throw new HttpError(400, 'Type mismatch or invalid item');
  }
}));

// Get photo galleries (folders in photos directory)
router.get('/cdn/photo-galleries', asyncHandler(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (galleryCache.data && Date.now() - galleryCache.ts < GALLERY_CACHE_TTL) {
    return res.json(galleryCache.data);
  }

  const photosDir = path.join(PUBLIC_DIR, 'photos');

  try {
    await fs.access(photosDir);
  } catch (error) {
    throw new HttpError(500, 'Failed to read photo galleries');
  }

  const items = await fs.readdir(photosDir);
  const galleryPromises = items.map(async (item) => {
    const itemPath = path.join(photosDir, item);
    const stats = await fs.stat(itemPath);
    if (!stats.isDirectory()) return null;

    const folderContents = await fs.readdir(itemPath);
    const imageFiles = folderContents.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));

    const imagePromises = imageFiles.map(async (imageFile) => {
      const imagePath = path.join(itemPath, imageFile);
      try {
        const metadata = await sharp(imagePath).metadata();
        const orientation = metadata.orientation || 1;
        const isRotated = orientation >= 5 && orientation <= 8;
        const displayWidth = isRotated ? metadata.height : metadata.width;
        const displayHeight = isRotated ? metadata.width : metadata.height;
        const isVertical = displayHeight > displayWidth;
        return {
          path: `photos/${item}/${imageFile}`,
          filename: imageFile,
          orientation: isVertical ? 'vertical' : 'horizontal',
          width: displayWidth,
          height: displayHeight,
        };
      } catch {
        return { path: `photos/${item}/${imageFile}`, filename: imageFile, orientation: 'unknown', width: null, height: null };
      }
    });

    const images = await Promise.all(imagePromises);
    return { name: item, path: `photos/${item}`, imageCount: images.length, images };
  });

  const results = await Promise.all(galleryPromises);
  const galleries = results.filter(Boolean);

  galleryCache.data = galleries;
  galleryCache.ts = Date.now();

  res.json(galleries);
}, 'Failed to read photo galleries'));

module.exports = router;
