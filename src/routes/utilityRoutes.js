const express = require('express');
const router = express.Router();
const { getAircraftAvailability } = require('../controllers/utilityController');
const { processReminders } = require('../controllers/reservationsController');
const { protect, authorize } = require('../middleware/auth');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/aircraft/availability', protect, asyncHandler(getAircraftAvailability));

// Manual trigger for reminders (admin/operator only)
router.post('/jobs/process-reminders', protect, authorize('admin', 'operator'), asyncHandler(async (req, res) => {
  await processReminders();
  res.json({ message: 'Reminders processed successfully' });
}));

module.exports = router;
