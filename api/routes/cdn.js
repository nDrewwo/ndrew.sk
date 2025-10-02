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
    fileSize: 700 * 1024 * 1024 // 50MB limit
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

// Upload file
router.post('/cdn/upload', authenticateToken, upload.single('file'), async (req, res) => {
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

module.exports = router;