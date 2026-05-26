const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pricing.controller');
const auth = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

router.get('/effective', auth, ctrl.getEffectivePrice);
router.get('/', auth, ctrl.getAllPricing);
router.post('/', auth, requireAdmin, ctrl.createPricing);
router.put('/:id', auth, requireAdmin, ctrl.updatePricing);
router.delete('/:id', auth, requireAdmin, ctrl.deletePricing);

module.exports = router;
