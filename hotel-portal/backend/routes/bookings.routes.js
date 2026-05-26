const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/bookings.controller');
const auth = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

router.get('/stats', auth, requireAdmin, ctrl.getBookingStats);
router.get('/', auth, ctrl.getAllBookings);
router.get('/:id', auth, ctrl.getBookingById);
router.post('/', auth, ctrl.createBooking);
router.patch('/:id/status', auth, requireAdmin, ctrl.updateBookingStatus);
router.delete('/:id', auth, ctrl.cancelBooking);

module.exports = router;
