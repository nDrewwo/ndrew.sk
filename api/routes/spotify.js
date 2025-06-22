const express = require('express');
const fetch = require('node-fetch');
const refreshAccessToken = require('../middleware/refreshAccessToken');

const router = express.Router();

let access_token = process.env.ACCESS_TOKEN;

router.get('/music', (req, res) => {
  refreshAccessToken()
    .then((newAccessToken) => {
      access_token = newAccessToken;
      return fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: 'Bearer ' + access_token },
      });
    })
    .then(response => {
      if (response.status === 204) {
        return fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
          headers: { Authorization: 'Bearer ' + access_token },
        });
      } else if (!response.ok) {
        throw new Error('Failed to fetch currently playing track');
      }
      return response.json();
    })
    .then(data => {
      if (data && data.item) {
        const currentTrack = data.item;
        res.json({
          name: currentTrack.name,
          artist: currentTrack.artists[0].name,
          albumArt: currentTrack.album.images[0].url,
        });
      } else {
        return fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
          headers: { Authorization: 'Bearer ' + access_token },
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Failed to fetch recently played track');
          }
          return response.json();
        })
        .then(data => {
          if (data.items && data.items.length > 0) {
            const lastTrack = data.items[0].track;
            const playedAt = new Date(data.items[0].played_at);
            const now = new Date();
            const timeDiff = now - playedAt;
            const seconds = Math.floor(timeDiff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            let timeAgo = '';
            if (days > 0) {
              timeAgo = `${days} day(s) ago`;
            } else if (hours > 0) {
              timeAgo = `${hours} hour(s) ago`;
            } else if (minutes > 0) {
              timeAgo = `${minutes} minute(s) ago`;
            } else {
              timeAgo = `${seconds} second(s) ago`;
            }
            res.json({
              name: lastTrack.name,
              artist: lastTrack.artists[0].name,
              albumArt: lastTrack.album.images[0].url,
              playedAt: timeAgo,
            });
          } else {
            res.status(404).json({ message: "No recently played track found" });
          }
        });
      }
    })
    .catch(error => {
      console.error('Error:', error.message);
      res.status(500).json({ error: error.message });
    });
});

module.exports = router;
