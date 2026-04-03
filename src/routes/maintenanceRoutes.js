const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

router.get('/', maintenanceController.getMaintenanceItems);
router.get('/:id', maintenanceController.getMaintenanceItemById);

// Only Admin or Operator can create/update
router.post('/', authorize('admin', 'operator'), maintenanceController.createMaintenanceItem);
router.put('/:id', authorize('admin', 'operator'), maintenanceController.updateMaintenanceItem);

// Only Admin can delete
router.delete('/:id', authorize('admin'), maintenanceController.deleteMaintenanceItem);

module.exports = router;
