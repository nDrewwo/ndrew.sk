const express = require('express');
const fetch = require('node-fetch');
const querystring = require('querystring');
const cors = require('cors');

require('dotenv').config();

const app = express();
const port = process.env.PORT;

app.use(cors());

const client_id =  process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const refresh_token = process.env.REFRESH_TOKEN; // Store securely

let access_token = process.env.ACCESS_TOKEN; // Store securely

app.get('/refresh-token', (req, res) => {
  const authOptions = {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + (Buffer.from(client_id + ':' + client_secret).toString('base64')),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: querystring.stringify({
      grant_type: 'refresh_token',
      refresh_token: refresh_token,
    }),
  };

  fetch('https://accounts.spotify.com/api/token', authOptions)
    .then((response) => response.json())
    .then((data) => {
      access_token = data.access_token;
      res.send('Access token refreshed');
    });
});

app.get('/last-played', (req, res) => {
    fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
      headers: {
        Authorization: 'Bearer ' + access_token,
      },
    })
    .then(response => response.json())
    .then(data => {
      if (data.items && data.items.length > 0) {
        const lastTrack = data.items[0].track;
        const playedAt = new Date(data.items[0].played_at); // Get the played_at timestamp
        const now = new Date();
        
        // Calculate time difference (in milliseconds)
        const timeDiff = now - playedAt;
        
        // Convert to minutes, hours, etc.
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
          playedAt: timeAgo,  // Include time ago
        });
      } else {
        // Handle case where no recent track data is available
        res.json({
          message: "No recently played track found",
        });
      }
    })
    .catch(error => {
      console.error('Error fetching last played track:', error);
      res.status(500).json({ error: 'Failed to fetch last played track' });
    });
  });

app.get('/currently-playing', (req, res) => {
    fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Authorization: 'Bearer ' + access_token,
      },
    })
    .then(response => response.json())
    .then(data => {
      if (data && data.item) {
        const currentTrack = data.item;
        res.json({
          name: currentTrack.name,
          artist: currentTrack.artists[0].name,
          albumArt: currentTrack.album.images[0].url,
        });
      } else {
        // Handle case where no track is currently playing
        res.json({
          message: "No track is currently playing",
        });
      }
    })
    .catch(error => {
      console.error('Error fetching currently playing track:', error);
      res.status(500).json({ error: 'Failed to fetch currently playing track' });
    });
  });
  

// SPOTIFY API OVER OVER OVER OVER 

const urls = [
  'https://ndrew.sk',
  'https://obedik.ndrew.sk',
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

// API route to ping URLs and return status
app.get('/ping', async (req, res) => {
  const statusPromises = urls.map(url => checkUrlStatus(url));
  const statuses = await Promise.all(statusPromises);
  res.json(statuses);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
