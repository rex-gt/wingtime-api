const express = require('express');
const userRoutes = require('./routes/userRoutes');
const memberRoutes = require('./routes/memberRoutes');
const aircraftRoutes = require('./routes/aircraftRoutes');
const reservationsRoutes = require('./routes/reservationsRoutes');
const flightLogsRoutes = require('./routes/flightLogsRoutes');
const billingRoutes = require('./routes/billingRoutes');
const pool = require('./config/database');
const bodyParser = require('body-parser');

const app = express();
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:4200',        // For local development
    'https://aviation-club-scheduler.vercel.app' // For Vercel deployment
  ],
  credentials: true
}));

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

// Middleware for error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============ UTILITY ENDPOINTS ============

app.get('/api/aircraft/availability', asyncHandler(async (req, res) => {
  const { start_time, end_time } = req.query;

  if (!start_time || !end_time) {
    return res.status(400).json({ error: 'start_time and end_time required' });
  }

  const result = await pool.query(
    `SELECT a.*,
       CASE WHEN r.id IS NULL THEN true ELSE false END as is_available_for_timeframe
     FROM aircraft a
     LEFT JOIN reservations r ON a.id = r.aircraft_id
       AND r.status NOT IN ('cancelled', 'completed')
       AND (
         (r.start_time <= $1 AND r.end_time > $1) OR
         (r.start_time < $2 AND r.end_time >= $2) OR
         (r.start_time >= $1 AND r.end_time <= $2)
       )
     WHERE a.is_available = true
     ORDER BY a.tail_number`,
    [start_time, end_time]
  );

  res.json(result.rows);
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

module.exports = app;
