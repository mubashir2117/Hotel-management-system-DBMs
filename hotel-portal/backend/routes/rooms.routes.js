const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rooms.controller');
const auth = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');

router.get('/status', auth, ctrl.getRoomStatus);
router.get('/available', auth, ctrl.getAvailableRooms);
router.get('/', auth, ctrl.getAllRooms);
router.get('/:id', auth, ctrl.getRoomById);
router.post('/', auth, requireAdmin, ctrl.createRoom);
router.put('/:id', auth, requireAdmin, ctrl.updateRoom);
router.patch('/:id/status', auth, requireAdmin, ctrl.updateRoomStatus);
router.delete('/:id', auth, requireAdmin, ctrl.deleteRoom);

module.exports = router;
