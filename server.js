require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const { Server } = require('socket.io');

const db = require('./src/config/db');
const { initSockets } = require('./src/sockets/socketHandler');

// Route handlers
const authRoutes = require('./src/routes/auth');
const campusRoutes = require('./src/routes/campus');
const complaintsRoutes = require('./src/routes/complaints');
const usersRoutes = require('./src/routes/users');
const statsRoutes = require('./src/routes/stats');
const notificationsRoutes = require('./src/routes/notifications');

const app = express();
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT']
  }
});
initSockets(io);

const PORT = process.env.PORT || 3000;

// Basic Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fix_my_campus_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set true only if HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  })
);

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/campus', campusRoutes);
app.use('/api/complaints', complaintsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check / API status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    app: 'Fix My Campus',
    version: '1.0.0',
    dbDriver: db.getDriver(),
    timestamp: new Date().toISOString()
  });
});

// Single Page Application Fallback
app.get('*', (req, res) => {
  // If it's an API call that wasn't handled, return 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack || err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.'
  });
});

// Start Server
async function start() {
  try {
    console.log('[Fix My Campus] Initializing database...');
    await db.initDB();

    server.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(` Fix My Campus Server is running!`);
      console.log(` URL: http://localhost:${PORT}`);
      console.log(` Database Mode: ${db.getDriver().toUpperCase()}`);
      console.log(` Real-time WebSockets: ENABLED`);
      console.log(`=======================================================`);
    });
  } catch (err) {
    console.error('[Fix My Campus] Failed to start server:', err);
    process.exit(1);
  }
}

start();
