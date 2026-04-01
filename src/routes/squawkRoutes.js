const express = require('express');
const router = express.Router();
const squawkController = require('../controllers/squawkController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/', squawkController.getSquawks);
router.get('/:id', squawkController.getSquawkById);

// Any authenticated user can create a squawk or add a comment
router.post('/', squawkController.createSquawk);
router.post('/:id/comments', squawkController.addComment);

// Only Admin or Operator can close a squawk
router.put('/:id/close', authorize('admin', 'operator'), squawkController.closeSquawk);

module.exports = router;
