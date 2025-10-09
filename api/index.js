const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
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
const mediaRouter = require('./routes/media');
const featureToggleRouter = require('./routes/featureToggle');
const breakingNewsRouter = require('./routes/breakingNews');
const pingRouter = require('./routes/ping');
const cdnRouter = require('./routes/cdn'); 

// Use routers
app.use('/', authRouter);
app.use('/', spotifyRouter);
app.use('/', mediaRouter);
app.use('/', featureToggleRouter);
app.use('/', breakingNewsRouter);
app.use('/', pingRouter);
app.use('/', cdnRouter); 

app.get('/', (req, res) => {
  res.send('api.ndrew.sk is up and running!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});