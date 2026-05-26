const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/services.controller');
const auth = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

router.get('/menu', auth, ctrl.getMenu);
router.post('/menu', auth, requireAdmin, ctrl.createMenuItem);
router.put('/menu/:id', auth, requireAdmin, ctrl.updateMenuItem);
router.delete('/menu/:id', auth, requireAdmin, ctrl.deleteMenuItem);

router.get('/requests', auth, ctrl.getAllRequests);
router.post('/request', auth, ctrl.createRequest);
router.patch('/requests/:id/status', auth, requireAdmin, ctrl.updateRequestStatus);

module.exports = router;
