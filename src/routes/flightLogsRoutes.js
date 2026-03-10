const express = require('express');
const router = express.Router();
const {
  getFlightLogs,
  getFlightLogById,
  createFlightLog,
  updateFlightLog,
  deleteFlightLog,
} = require('../controllers/flightLogsController');
const { protect } = require('../middleware/auth');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', protect, asyncHandler(getFlightLogs));
router.get('/:id', protect, asyncHandler(getFlightLogById));
router.post('/', protect, asyncHandler(createFlightLog));
router.put('/:id', protect, asyncHandler(updateFlightLog));
router.delete('/:id', protect, asyncHandler(deleteFlightLog));

module.exports = router;
