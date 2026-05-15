const express = require('express');
const { assessments, emergencyResources } = require('../controllers/publicController');

const router = express.Router();

router.get('/assessments', assessments);
router.get('/emergency-resources', emergencyResources);

module.exports = router;