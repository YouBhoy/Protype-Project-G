const express = require('express');
const { signup, facilitatorSignup, studentLogin, facilitatorLogin, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/student/signup', signup);
router.post('/facilitator/signup', facilitatorSignup);
router.post('/student/login', studentLogin);
router.post('/facilitator/login', facilitatorLogin);
router.get('/me', authenticate, me);

module.exports = router;