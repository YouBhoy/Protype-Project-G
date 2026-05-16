const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { facilitatorDashboard } = require('../controllers/analyticsController');
const { facilitatorAvailability, createSlot, updateSlot, deleteSlot, facilitatorAppointments, updateQueueItem, deleteQueueItem, updateStatus } = require('../controllers/appointmentController');

const router = express.Router();

router.use(authenticate, requireRole('ogc'));

router.get('/dashboard', facilitatorDashboard);
router.get('/availability', facilitatorAvailability);
router.post('/availability', createSlot);
router.patch('/availability/:id', updateSlot);
router.delete('/availability/:id', deleteSlot);
router.get('/appointments', facilitatorAppointments);
router.patch('/appointments/:id', updateQueueItem);
router.delete('/appointments/:id', deleteQueueItem);
router.patch('/appointments/:id/status', updateStatus);

module.exports = router;