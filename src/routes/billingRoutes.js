const express = require('express');
const router = express.Router();
const {
  getBilling,
  generateBilling,
  markBillingAsPaid,
  getBillingSummary,
  deleteBilling,
} = require('../controllers/billingController');
const { protect } = require('../middleware/auth');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', protect, asyncHandler(getBilling));
router.post('/generate', protect, asyncHandler(generateBilling));
router.put('/:id/pay', protect, asyncHandler(markBillingAsPaid));
router.get('/summary/:member_id', protect, asyncHandler(getBillingSummary));
router.delete('/:id', protect, asyncHandler(deleteBilling));

module.exports = router;
