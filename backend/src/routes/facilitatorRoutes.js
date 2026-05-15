const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { facilitatorDashboard } = require('../controllers/analyticsController');
const { facilitatorAvailability, createSlot, facilitatorAppointments, updateStatus } = require('../controllers/appointmentController');

const router = express.Router();

router.use(authenticate, requireRole('ogc'));

router.get('/dashboard', facilitatorDashboard);
router.get('/availability', facilitatorAvailability);
router.post('/availability', createSlot);
router.get('/appointments', facilitatorAppointments);
router.patch('/appointments/:id/status', updateStatus);

module.exports = router;