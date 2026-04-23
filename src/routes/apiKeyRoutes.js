const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/apiKeyController');
const { protect, authorize } = require('../middleware/auth');

// All routes require admin role
router.use(protect);
router.use(authorize('admin'));

router.get('/', apiKeyController.getApiKeys);
router.post('/', apiKeyController.createApiKey);
router.delete('/:id', apiKeyController.deleteApiKey);

module.exports = router;
