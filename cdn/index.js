const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();

require('dotenv').config();

// Enable gzip compression to reduce the file sizes
app.use(compression());

// Set cache headers for static files (e.g., images, CSS, JS)
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    next();
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
const PORT = process.env.PORT
app.listen(PORT, () => {
    console.log(`CDN server is running on port http://localhost:${PORT}`);
});
