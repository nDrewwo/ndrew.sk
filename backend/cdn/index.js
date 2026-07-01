const express = require('express');
const path = require('path');
const compression = require('compression');
const cors = require('cors');
const sharp = require('sharp');
const fs = require('fs');

const app = express();
app.use(cors());

require('dotenv').config();

// Enable gzip compression to reduce the file sizes
app.use(compression({
    filter: (req, res) => {
        const contentType = res.getHeader('Content-Type') || '';
        if (req.url.endsWith('.zip')) return false; // don't compress zip files
        return compression.filter(req, res); // default filter
    }
}));

// Set cache headers for static files (e.g., images, CSS, JS)
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    next();
});

// Image quality processing middleware
app.use(async (req, res, next) => {
    const filePath = path.join(__dirname, 'public', req.path);
    const quality = req.query.quality;
    
    // Check if the request is for an image and has a quality parameter
    if (quality && /\.(jpg|jpeg|png|webp)$/i.test(req.path)) {
        try {
            // Check if the original file exists
            if (!fs.existsSync(filePath)) {
                return next(); // Let static middleware handle 404
            }

            // Get image metadata to determine orientation
            const metadata = await sharp(filePath).metadata();
            
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

            // Quality settings
            let qualitySettings = {};
            switch (quality.toLowerCase()) {
                case 'low':
                    qualitySettings = { 
                        jpeg: { quality: 30 }, 
                        png: { quality: 30 }, 
                        webp: { quality: 30 },
                        resize: isVertical ? { height: 800 } : { width: 800 }
                    };
                    break;
                case 'medium':
                    qualitySettings = { 
                        jpeg: { quality: 60 }, 
                        png: { quality: 60 }, 
                        webp: { quality: 60 },
                        resize: isVertical ? { height: 1200 } : { width: 1200 }
                    };
                    break;
                case 'high':
                    qualitySettings = { 
                        jpeg: { quality: 85 }, 
                        png: { quality: 85 }, 
                        webp: { quality: 85 },
                        resize: null // No resizing for high quality
                    };
                    break;
                default:
                    // Invalid quality parameter, serve original
                    return next();
            }

            // Get file extension
            const ext = path.extname(req.path).toLowerCase();
            
            // Process the image with Sharp
            let sharpInstance = sharp(filePath)
                .rotate(); // Auto-rotate based on EXIF orientation
            
            // Apply resizing if specified
            if (qualitySettings.resize) {
                sharpInstance = sharpInstance.resize(
                    qualitySettings.resize.width || null,
                    qualitySettings.resize.height || null,
                    {
                        withoutEnlargement: true,
                        fit: 'inside' // Ensure aspect ratio is maintained
                    }
                );
            }

            // Apply quality settings based on format
            let processedImage;
            switch (ext) {
                case '.jpg':
                case '.jpeg':
                    processedImage = await sharpInstance
                        .jpeg(qualitySettings.jpeg)
                        .toBuffer();
                    res.setHeader('Content-Type', 'image/jpeg');
                    break;
                case '.png':
                    processedImage = await sharpInstance
                        .png(qualitySettings.png)
                        .toBuffer();
                    res.setHeader('Content-Type', 'image/png');
                    break;
                case '.webp':
                    processedImage = await sharpInstance
                        .webp(qualitySettings.webp)
                        .toBuffer();
                    res.setHeader('Content-Type', 'image/webp');
                    break;
                default:
                    return next();
            }

            // Set appropriate cache headers for processed images
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
            
            res.send(processedImage);
            
        } catch (error) {
            console.error('Error processing image:', error);
            // If processing fails, serve the original
            return next();
        }
    } else {
        // Not an image or no quality parameter, continue to static serving
        next();
    }
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
const PORT = process.env.PORT
app.listen(PORT, () => {
    console.log(`CDN server is running on port http://localhost:${PORT}`);
});