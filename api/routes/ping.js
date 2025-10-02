const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();
const cache = new Map(); // Cache to store URL statuses
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

const urls = [
    'https://ndrew.sk',
    'https://adinomart.ndrew.sk',
    'https://quotes.ndrew.sk'
];

// Function to check the status of a URL
const checkUrlStatus = async (url) => {
    try {
        const response = await fetch(url, { method: 'HEAD', timeout: 5000 });
        if (response.ok) {
            return { url, status: '[OKIE :3]' };
        } else {
            return { url, status: '[NOT OKIE :(]' };
        }
    } catch (error) {
        return { url, status: '[NOT OKIE :(]' };
    }
};

// API endpoint to ping URLs and return status
router.get('/ping', async (req, res) => {
    try {
        const now = Date.now();
        const cachedStatuses = cache.get('statuses');

        if (cachedStatuses && now - cachedStatuses.timestamp < CACHE_DURATION) {
            // Return cached data if it's still valid
            return res.json(cachedStatuses.data);
        }

        const statusPromises = urls.map(url => checkUrlStatus(url));
        const statuses = await Promise.all(statusPromises);

        // Store the result in the cache
        cache.set('statuses', { data: statuses, timestamp: now });

        res.json(statuses);
    } catch (error) {
        res.status(500).json({ error: 'Server error while pinging URLs' });
    }
});

module.exports = router;
