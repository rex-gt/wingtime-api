const express = require('express');
const router = express.Router();
const {
  getBillingRecords,
  generateBilling,
  payBillingRecord,
  getBillingSummary,
  deleteBillingRecord,
} = require('../controllers/billingController');

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/', asyncHandler(getBillingRecords));
router.get('/summary/:member_id', asyncHandler(getBillingSummary));
router.post('/generate', asyncHandler(generateBilling));
router.put('/:id/pay', asyncHandler(payBillingRecord));
router.delete('/:id', asyncHandler(deleteBillingRecord));

module.exports = router;
