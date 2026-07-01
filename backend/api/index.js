const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT;

const corsOptions = {
  origin: (origin, callback) => {
    callback(null, origin || '*'); // Allow any origin
  },
  credentials: true, // Allow cookies
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Add timeout configuration for large uploads
app.use((req, res, next) => {
  // Set timeout to 5 minutes for large uploads
  req.setTimeout(300000);
  res.setTimeout(300000);
  next();
});

// Import routers
const authRouter = require('./routes/auth');
const spotifyRouter = require('./routes/spotify');
const featureToggleRouter = require('./routes/featureToggle');
const breakingNewsRouter = require('./routes/breakingNews');
const pingRouter = require('./routes/ping');
const cdnRouter = require('./routes/cdn');
const poemsRouter = require('./routes/poems');
const quotesRouter = require('./routes/quotes');
const { cleanupExpiredSessions } = require('./utils/uploadSessions');

// Use routers
app.use('/', authRouter);
app.use('/', spotifyRouter);
app.use('/', featureToggleRouter);
app.use('/', breakingNewsRouter);
app.use('/', pingRouter);
app.use('/', cdnRouter);
app.use('/', poemsRouter);
app.use('/', quotesRouter); 

app.get('/', (req, res) => {
  res.send('api.ndrew.sk is up and running!');
});

// Add cleanup for abandoned upload sessions
setInterval(() => {
  cleanupExpiredSessions(path.join(__dirname, '../cdn/public/temp_chunks')).catch(() => {});
}, 5 * 60 * 1000); // Run every 5 minutes

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});