const express = require('express');
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const STATIC_PASSWORD = process.env.STATIC_PASSWORD;

// Login endpoint
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === STATIC_PASSWORD) {
    const token = jwt.sign({ username: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true, secure: false });
    res.json({ message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Validate token endpoint (protected)
router.post('/validate-token', authenticateToken, (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    res.status(200).json({ message: 'Token is valid' });
  });
});

module.exports = router;
