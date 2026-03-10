const express = require('express');
const router = express.Router();
const {
  getAircraftList,
  getAircraftById,
  createAircraft,
  updateAircraft,
  deleteAircraft,
  getAircraftAvailability,
} = require('../controllers/aircraftController');
const { protect, authorize } = require('../middleware/auth');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/availability', protect, asyncHandler(getAircraftAvailability));
router.get('/', protect, asyncHandler(getAircraftList));
router.get('/:id', protect, asyncHandler(getAircraftById));
router.post('/', protect, authorize('admin', 'operator'), asyncHandler(createAircraft));
router.put('/:id', protect, authorize('admin', 'operator'), asyncHandler(updateAircraft));
router.delete('/:id', protect, authorize('admin'), asyncHandler(deleteAircraft));

module.exports = router;
