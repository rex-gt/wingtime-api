const express = require('express');
const router = express.Router();
const {
  getReservations,
  getReservationById,
  createReservation,
  updateReservation,
  deleteReservation,
} = require('../controllers/reservationsController');
const { protect } = require('../middleware/auth');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', protect, asyncHandler(getReservations));
router.get('/:id', protect, asyncHandler(getReservationById));
router.post('/', protect, asyncHandler(createReservation));
router.put('/:id', protect, asyncHandler(updateReservation));
router.delete('/:id', protect, asyncHandler(deleteReservation));

module.exports = router;
