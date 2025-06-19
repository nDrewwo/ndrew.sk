const express = require('express');
const fetch = require('node-fetch');
const querystring = require('querystring');
const cors = require('cors');
const mariadb = require('mariadb');

require('dotenv').config();

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(express.json()); // To parse JSON bodies

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const refresh_token = process.env.REFRESH_TOKEN; 

let access_token = process.env.ACCESS_TOKEN; 

// Connection Pool
const pool = mariadb.createPool({
  host: process.env.DB_HOST, 
  user: process.env.DB_USER, 
  password: process.env.DB_PASS, 
  database: 'ndrew',
  connectionLimit: 5
});

const refreshAccessToken = () => {
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

  return fetch('https://accounts.spotify.com/api/token', authOptions)
    .then((response) => response.json())
    .then((data) => {
      access_token = data.access_token;
      return access_token;
    });
};

app.get('/music', (req, res) => {
  refreshAccessToken()
    .then(() => {
      return fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          Authorization: 'Bearer ' + access_token,
        },
      });
    })
    .then(response => {
      if (response.status === 204) {
        // No content, fetch recently played track
        return fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
          headers: {
            Authorization: 'Bearer ' + access_token,
          },
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
          headers: {
            Authorization: 'Bearer ' + access_token,
          },
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
            res.status(404).json({
              message: "No recently played track found",
            });
          }
        });
      }
    })
    .catch(error => {
      console.error('Error:', error.message);
      res.status(500).json({ error: error.message });
    });
});

// SPOTIFY API OVER OVER OVER OVER 

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
app.get('/ping', async (req, res) => {
  const statusPromises = urls.map(url => checkUrlStatus(url));
  const statuses = await Promise.all(statusPromises);
  res.json(statuses);
});

app.get('/media', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT * FROM media");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/anime', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT title,author,status,rating,cover_image FROM media WHERE type = 'anime'");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/manga', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT title,author,status,rating,cover_image FROM media WHERE type = 'manga'");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/movies', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT title,author,status,rating,cover_image FROM media WHERE type = 'movie'");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/feature-toggles', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT name, value FROM featureToggle');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  } finally {
    if (conn) await conn.release();
  }
});

app.get('/breaking-news', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT news_text FROM breaking_news ORDER BY created_at DESC LIMIT 1");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/minute-by-minute', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT created_at, news_text FROM breaking_news ORDER BY created_at ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});


app.get('/', (req, res) => {
  res.send('api.ndrew.sk is up and running!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});