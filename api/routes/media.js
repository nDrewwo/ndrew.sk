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

router.get('/media', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT title,author,type,status,rating,cover_image FROM media");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

router.get('/anime', async (req, res) => {
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

router.get('/manga', async (req, res) => {
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

router.get('/movies', async (req, res) => {
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

router.get('/series', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query("SELECT title,author,status,rating,cover_image FROM media WHERE type = 'series'");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) conn.release();
  }
});

router.get('/count', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [animeCount] = await conn.query("SELECT COUNT(*) as COUNT FROM media WHERE type = 'anime'");
    const [mangaCount] = await conn.query("SELECT COUNT(*) as COUNT FROM media WHERE type = 'manga'");
    const [movieCount] = await conn.query("SELECT COUNT(*) as COUNT FROM media WHERE type = 'movie'");
    const [seriesCount] = await conn.query("SELECT COUNT(*) as COUNT FROM media WHERE type = 'movie'");
    res.json({ anime: Number(animeCount.COUNT), manga: Number(mangaCount.COUNT), movies: Number(movieCount.COUNT), series: Number(seriesCount.COUNT) });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  } finally {
    if (conn) conn.release();
  }
});

router.get('/favourites', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    const [row] = await conn.query("SELECT favourite_movie,favourite_series,favourite_anime,favourite_manga FROM favourites");
    res.json({
      movie: row?.favourite_movie ?? null,
      series: row?.favourite_series ?? null,
      anime: row?.favourite_anime ?? null,
      manga: row?.favourite_manga ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
