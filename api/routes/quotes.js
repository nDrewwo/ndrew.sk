const express = require('express');
const xss = require('xss');
const mariadb = require('mariadb');

const router = express.Router();
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

// Fetch feature toggles from the API
async function getFeatureToggles() {
  let conn;
  try {
    conn = await pool.getConnection();
    const toggles = await conn.query("SELECT name, value FROM feature_toggles");
    const toggleMap = {};
    toggles.forEach(toggle => {
      toggleMap[toggle.name] = toggle.value;
    });
    return toggleMap;
  } catch (err) {
    console.error('Error fetching feature toggles:', err.message);
    return {};
  } finally {
    if (conn) conn.release();
  }
}

router.get('/quotes', async (req, res) => {
  let conn;
  try {
    const toggles = await getFeatureToggles();
    const nsfwEnabled = toggles.nsfwQuotes === 1;
    
    conn = await pool.getConnection();
    let query = "SELECT author, quote FROM quotes";
    if (!nsfwEnabled) {
      query += " WHERE nsfw = 0";
    }
    
    const rows = await conn.query(query);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

router.get('/random-quote', async (req, res) => {
  let conn;
  try {
    const toggles = await getFeatureToggles();
    const nsfwEnabled = toggles.nsfwQuotes === 1;
    
    conn = await pool.getConnection();
    let query = "SELECT author, quote FROM quotes";
    if (!nsfwEnabled) {
      query += " WHERE nsfw = 0";
    }
    
    const rows = await conn.query(query);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No quotes found' });
    }
    
    res.json(rows[Math.floor(Math.random() * rows.length)]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

router.post('/addquote', async (req, res) => {
  let conn;
  try {
    let { author, quote } = req.body;
    if (!author || !quote) {
      return res.status(400).json({ error: 'Author and quote are required.' });
    }
    
    // Sanitize the input
    author = xss(author);
    quote = xss(quote);

    conn = await pool.getConnection();
    await conn.query("INSERT INTO quotes (author, quote) VALUES (?, ?)", [author, quote]);
    res.status(201).json({ message: 'Quote added successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
