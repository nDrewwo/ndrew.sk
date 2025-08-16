const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();

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