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

// Helper function to format poems with HTML line breaks
const formatPoem = (poem) => {
  return poem.replace(/\r\n|\n|\r/g, '<br/>');
};

router.get('/poems', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT author, poem FROM poems");
    
    const formattedRows = rows.map(row => ({
      ...row,
      poem: formatPoem(row.poem)
    }));
    
    res.json(formattedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

router.get('/randompoem', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT author, poem FROM poems");
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No poems found' });
    }
    
    const randomPoem = rows[Math.floor(Math.random() * rows.length)];
    res.json({
      ...randomPoem,
      poem: formatPoem(randomPoem.poem)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
