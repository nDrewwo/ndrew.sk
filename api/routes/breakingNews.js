const express = require('express');
const mariadb = require('mariadb');

const router = express.Router();
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectionLimit: 5,
});

router.get('/breaking-news', async (req, res) => {
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

router.get('/minute-by-minute', async (req, res) => {
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

router.post('/add-breaking-news', async (req, res) => {
  const { news_text } = req.body;
  if (!news_text || typeof news_text !== 'string') {
    return res.status(400).json({ error: 'Invalid news text' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('INSERT INTO breaking_news (news_text) VALUES (?)', [news_text]);
    res.status(201).json({ message: 'Breaking news added successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
