const express = require('express');
const router = express.Router();
const {
  getBilling,
  generateBilling,
  markBillingAsPaid,
  getBillingSummary,
  deleteBilling,
} = require('../controllers/billingController');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', asyncHandler(getBilling));
router.post('/generate', asyncHandler(generateBilling));
router.put('/:id/pay', asyncHandler(markBillingAsPaid));
router.get('/summary/:member_id', asyncHandler(getBillingSummary));
router.delete('/:id', asyncHandler(deleteBilling));

module.exports = router;
