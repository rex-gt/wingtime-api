const express = require('express');
const userRoutes = require('./routes/userRoutes');
const memberRoutes = require('./routes/memberRoutes');
const aircraftRoutes = require('./routes/aircraftRoutes');
const reservationsRoutes = require('./routes/reservationsRoutes');
const flightLogsRoutes = require('./routes/flightLogsRoutes');
const billingRoutes = require('./routes/billingRoutes');
const utilityRoutes = require('./routes/utilityRoutes');
const pool = require('./config/database');
const bodyParser = require('body-parser');

const app = express();
const cors = require('cors');

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'https://localhost:5173', 'http://localhost:4200', 'https://aerobook.app'];

function isOriginAllowed(origin) {
  // Exact match
  if (allowedOrigins.includes(origin)) return true;
  // Wildcard pattern match, e.g. "*.vercel.app" or "*.railway.app"
  for (const allowed of allowedOrigins) {
    if (allowed.startsWith('*.')) {
      const suffix = allowed.slice(1); // e.g. ".vercel.app"
      if (origin.endsWith(suffix)) return true;
    }
  }
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (isOriginAllowed(origin)) return callback(null, true);
    const err = new Error(`CORS: origin '${origin}' not allowed`);
    err.status = 403;
    callback(err);
  },
  credentials: true
}));

// Handle CORS errors before other middleware
app.use((err, req, res, next) => {
  if (err.status === 403 && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: 'Forbidden', message: err.message });
  }
  next(err);
});

// Middleware
app.use(express.json());
app.use(bodyParser.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/aircraft', aircraftRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/flight-logs', flightLogsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api', utilityRoutes);

// Middleware for error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

module.exports = app;
