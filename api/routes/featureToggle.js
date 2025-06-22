const express = require('express');
const mariadb = require('mariadb');

const router = express.Router();
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: 'ndrew',
  connectionLimit: 5,
});

router.get('/feature-toggles', async (req, res) => {
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

router.post('/update-feature-toggles', async (req, res) => {
  const toggles = req.body.toggles;
  if (!Array.isArray(toggles)) {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  let conn;
  try {
    conn = await pool.getConnection();
    const updatePromises = toggles.map(toggle =>
      conn.query('UPDATE featureToggle SET value = ? WHERE name = ?', [toggle.value, toggle.name])
    );
    await Promise.all(updatePromises);
    res.status(200).json({ message: 'Feature toggles updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Database error', details: err.message });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
