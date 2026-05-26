const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/guests.controller');
const auth = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

router.get('/', auth, requireAdmin, ctrl.getAllGuests);
router.get('/:id', auth, requireAdmin, ctrl.getGuestById);

// Ensure karein ki ye routes yahan maujood hain:
router.put('/:userId', auth, requireAdmin, ctrl.updateGuestProfile);
router.delete('/:userId', auth, requireAdmin, ctrl.deleteGuestUser);

module.exports = router;