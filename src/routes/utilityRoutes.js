const express = require('express');
const router = express.Router();
const { getAircraftAvailability } = require('../controllers/utilityController');
const { protect } = require('../middleware/auth');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/aircraft/availability', protect, asyncHandler(getAircraftAvailability));

module.exports = router;
