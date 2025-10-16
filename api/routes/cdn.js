const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Use a temporary directory first, we'll move the file later
    const publicDir = path.join(__dirname, '../../cdn/public');
    cb(null, publicDir);
  },
  filename: (req, file, cb) => {
    // Use a temporary filename to avoid conflicts
    cb(null, `temp_${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 700 * 1024 * 1024 // 700MB limit
  }
});

// Get directory contents
router.get('/cdn/browse', authenticateToken, async (req, res) => {
  const requestedPath = req.query.path || '';
  const publicDir = path.join(__dirname, '../../cdn/public');
  const fullPath = path.join(publicDir, requestedPath);
  
  // Security check - ensure we're staying within public directory
  if (!fullPath.startsWith(publicDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    const stats = await fs.stat(fullPath);
    
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
      // Return file info
      res.json({
        name: path.basename(fullPath),
        path: requestedPath,
        type: 'file',
        size: stats.size,
        modified: stats.mtime.toISOString()
      });
    }
  } catch (error) {
    res.status(404).json({ error: 'Path not found' });
  }
});

// Create new folder
router.post('/cdn/create-folder', authenticateToken, async (req, res) => {
  const { path: requestedPath, folderName } = req.body;
  
  if (!folderName) {
    return res.status(400).json({ error: 'Folder name is required' });
  }
  
  // Sanitize folder name
  const sanitizedName = folderName.replace(/[<>:"/\\|?*]/g, '').trim();
  if (!sanitizedName) {
    return res.status(400).json({ error: 'Invalid folder name' });
  }
  
  const publicDir = path.join(__dirname, '../../cdn/public');
  const parentPath = path.join(publicDir, requestedPath || '');
  const newFolderPath = path.join(parentPath, sanitizedName);
  
  // Security check - ensure we're staying within public directory
  if (!newFolderPath.startsWith(publicDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  try {
    // Check if folder already exists
    try {
      await fs.access(newFolderPath);
      return res.status(409).json({ error: 'Folder already exists' });
    } catch (e) {
      // Folder doesn't exist, we can create it
    }
    
    await fs.mkdir(newFolderPath, { recursive: true });
    res.json({ 
      success: true, 
      message: 'Folder created successfully',
      folderName: sanitizedName
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
});

// Initialize chunked upload
router.post('/cdn/upload-init', authenticateToken, async (req, res) => {
  try {
    const { fileName, fileSize, totalChunks, path: uploadPath } = req.body;
    
    if (!fileName || !fileSize || !totalChunks) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Generate unique upload ID
    const uploadId = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // Store upload metadata (in production, use Redis or database)
    global.uploadSessions = global.uploadSessions || new Map();
    global.uploadSessions.set(uploadId, {
      fileName,
      fileSize,
      totalChunks,
      uploadPath: uploadPath || '',
      uploadedChunks: new Set(),
      createdAt: Date.now()
    });

    res.json({ uploadId, message: 'Upload session initialized' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to initialize upload' });
  }
});

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
}, async (req, res) => {
  try {
    const { uploadId, chunkIndex } = req.body;
    const chunkFile = req.file;

    if (!uploadId || chunkIndex === undefined || !chunkFile) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    global.uploadSessions = global.uploadSessions || new Map();
    const session = global.uploadSessions.get(uploadId);
    
    if (!session) {
      // Clean up temp file
      await fs.unlink(chunkFile.path).catch(() => {});
      return res.status(404).json({ error: 'Upload session not found' });
    }

    // Create chunks directory
    const publicDir = path.join(__dirname, '../../cdn/public');
    const chunksDir = path.join(publicDir, 'temp_chunks', uploadId);
    await fs.mkdir(chunksDir, { recursive: true });

    // Move chunk to chunks directory
    const chunkPath = path.join(chunksDir, `chunk_${chunkIndex}`);
    await fs.rename(chunkFile.path, chunkPath);

    // Track uploaded chunk
    session.uploadedChunks.add(parseInt(chunkIndex));

    res.json({ 
      message: 'Chunk uploaded successfully',
      uploadedChunks: session.uploadedChunks.size,
      totalChunks: session.totalChunks
    });
  } catch (error) {
    console.error('Chunk upload error:', error);
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Failed to upload chunk' });
  }
});

// Finalize chunked upload
router.post('/cdn/upload-finalize', authenticateToken, async (req, res) => {
  try {
    const { uploadId } = req.body;

    global.uploadSessions = global.uploadSessions || new Map();
    const session = global.uploadSessions.get(uploadId);
    
    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }

    // Check if all chunks are uploaded
    if (session.uploadedChunks.size !== session.totalChunks) {
      return res.status(400).json({ 
        error: 'Missing chunks',
        uploaded: session.uploadedChunks.size,
        total: session.totalChunks
      });
    }

    const publicDir = path.join(__dirname, '../../cdn/public');
    const chunksDir = path.join(publicDir, 'temp_chunks', uploadId);
    const targetDir = path.join(publicDir, session.uploadPath);
    const finalFilePath = path.join(targetDir, session.fileName);

    // Security check
    if (!targetDir.startsWith(publicDir) || !finalFilePath.startsWith(publicDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });

    // Combine chunks into final file using streams for memory efficiency
    await new Promise((resolve, reject) => {
      const writeStream = require('fs').createWriteStream(finalFilePath);
      
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
      
      const writeNextChunk = async (chunkIndex) => {
        if (chunkIndex >= session.totalChunks) {
          writeStream.end();
          return;
        }
        
        const chunkPath = path.join(chunksDir, `chunk_${chunkIndex}`);
        try {
          const readStream = require('fs').createReadStream(chunkPath);
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
    global.uploadSessions.delete(uploadId);

    res.json({ 
      success: true, 
      message: 'File uploaded successfully',
      fileName: session.fileName,
      size: session.fileSize
    });
  } catch (error) {
    console.error('Finalize upload error:', error);
    res.status(500).json({ error: 'Failed to finalize upload' });
  }
});

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
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const uploadPath = req.body.path || '';
    const publicDir = path.join(__dirname, '../../cdn/public');
    const targetDir = path.join(publicDir, uploadPath);
    const tempFilePath = req.file.path;
    const finalFilePath = path.join(targetDir, req.file.originalname);
    
    // Security check - ensure we're staying within public directory
    if (!targetDir.startsWith(publicDir) || !finalFilePath.startsWith(publicDir)) {
      // Clean up temp file
      await fs.unlink(tempFilePath).catch(() => {});
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Ensure target directory exists
    await fs.mkdir(targetDir, { recursive: true });
    
    // Move file from temp location to final location
    await fs.rename(tempFilePath, finalFilePath);
    
    res.json({ 
      success: true, 
      message: 'File uploaded successfully',
      fileName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    // Clean up temp file if it exists
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Delete file or directory
router.delete('/cdn/delete', authenticateToken, async (req, res) => {
  const { path: requestedPath, type } = req.body;
  
  if (!requestedPath) {
    return res.status(400).json({ error: 'Path is required' });
  }
  
  const publicDir = path.join(__dirname, '../../cdn/public');
  const fullPath = path.join(publicDir, requestedPath);
  
  // Security check - ensure we're staying within public directory
  if (!fullPath.startsWith(publicDir)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  // Prevent deletion of root directory
  if (fullPath === publicDir) {
    return res.status(403).json({ error: 'Cannot delete root directory' });
  }
  
  try {
    const stats = await fs.stat(fullPath);
    
    if (type === 'directory' && stats.isDirectory()) {
      // Delete directory and all contents using the modern fs.rm method
      await fs.rm(fullPath, { recursive: true, force: true });
      res.json({ success: true, message: 'Directory deleted successfully' });
    } else if (type === 'file' && stats.isFile()) {
      // Delete file
      await fs.unlink(fullPath);
      res.json({ success: true, message: 'File deleted successfully' });
    } else {
      res.status(400).json({ error: 'Type mismatch or invalid item' });
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: 'File or directory not found' });
    } else if (error.code === 'ENOTEMPTY') {
      res.status(400).json({ error: 'Directory not empty' });
    } else {
      console.error('Delete error:', error);
      res.status(500).json({ error: 'Failed to delete item' });
    }
  }
});

// Get photo galleries (folders in photos directory)
router.get('/cdn/photo-galleries', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const photosDir = path.join(__dirname, '../../cdn/public/photos');
  
  try {
    // Check if photos directory exists
    await fs.access(photosDir);
    
    const items = await fs.readdir(photosDir);
    const galleries = [];
    
    for (const item of items) {
      const itemPath = path.join(photosDir, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory()) {
        // Get all images in this folder
        const folderContents = await fs.readdir(itemPath);
        const imageFiles = folderContents.filter(file => 
          /\.(jpg|jpeg|png|gif|webp)$/i.test(file)
        );
        
        // Get orientation info for each image
        const images = [];
        for (const imageFile of imageFiles) {
          const imagePath = path.join(itemPath, imageFile);
          
          try {
            // Use Sharp to get image metadata (similar to your CDN quality processing)
            const sharp = require('sharp');
            const metadata = await sharp(imagePath).metadata();
            
            // Check EXIF orientation to determine if image is rotated
            const orientation = metadata.orientation || 1;
            const isRotated = orientation >= 5 && orientation <= 8; // orientations 5,6,7,8 involve 90° rotation
            
            // Determine if image is vertical considering both dimensions and EXIF rotation
            let isVertical;
            if (isRotated) {
              // If rotated 90°, swap width/height for comparison
              isVertical = metadata.width > metadata.height;
            } else {
              // Normal comparison
              isVertical = metadata.height > metadata.width;
            }
            
            images.push({
              path: `photos/${item}/${imageFile}`,
              filename: imageFile,
              orientation: isVertical ? 'vertical' : 'horizontal'
            });
          } catch (error) {
            // If we can't read metadata, add the image without orientation info
            console.warn(`Could not read metadata for ${imageFile}:`, error.message);
            images.push({
              path: `photos/${item}/${imageFile}`,
              filename: imageFile,
              orientation: 'unknown'
            });
          }
        }
        
        galleries.push({
          name: item,
          path: `photos/${item}`,
          imageCount: images.length,
          images: images
        });
      }
    }
    
    res.json(galleries);
  } catch (error) {
    console.error('Error reading photos directory:', error);
    res.status(500).json({ error: 'Failed to read photo galleries' });
  }
});

module.exports = router;