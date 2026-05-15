const asyncHandler = require('../utils/asyncHandler');
const { listAssessmentCatalog } = require('../services/assessmentCatalog');
const { listEmergencyContacts } = require('../services/emergencyService');

const assessments = asyncHandler(async (req, res) => {
  res.json({ items: listAssessmentCatalog() });
});

const emergencyResources = asyncHandler(async (req, res) => {
  const items = await listEmergencyContacts();
  res.json({ items });
});

module.exports = { assessments, emergencyResources };