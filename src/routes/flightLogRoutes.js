const express = require('express');
const router = express.Router();
const {
  getFlightLogs,
  getFlightLogById,
  createFlightLog,
  updateFlightLog,
  deleteFlightLog,
} = require('../controllers/flightLogController');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', asyncHandler(getFlightLogs));
router.get('/:id', asyncHandler(getFlightLogById));
router.post('/', asyncHandler(createFlightLog));
router.put('/:id', asyncHandler(updateFlightLog));
router.delete('/:id', asyncHandler(deleteFlightLog));

module.exports = router;
