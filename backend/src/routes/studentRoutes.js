const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { profile, consent, dashboard, assessmentHistory } = require('../controllers/studentController');
const { catalog, submit } = require('../controllers/assessmentController');
const { availableSlots, studentAppointments, request, cancel } = require('../controllers/appointmentController');
const { studentAnalytics } = require('../controllers/analyticsController');

const router = express.Router();

router.use(authenticate, requireRole('student'));

router.get('/profile', profile);
router.post('/profile/consent', consent);
router.get('/dashboard', dashboard);
router.get('/analytics', studentAnalytics);
router.get('/assessments/catalog', catalog);
router.get('/assessments/history', assessmentHistory);
router.post('/assessments/:type/submit', submit);
router.get('/appointments/available', availableSlots);
router.get('/appointments', studentAppointments);
router.post('/appointments', request);
router.patch('/appointments/:id/cancel', cancel);

module.exports = router;