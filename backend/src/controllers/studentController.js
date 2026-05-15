const asyncHandler = require('../utils/asyncHandler');
const { acceptConsent, getStudentProfile, getStudentDashboard } = require('../services/studentService');
const { getStudentAssessmentHistory } = require('../services/assessmentService');

const profile = asyncHandler(async (req, res) => {
  const user = await getStudentProfile(req.user.id);
  res.json({ user });
});

const consent = asyncHandler(async (req, res) => {
  await acceptConsent(req.user.id);
  const user = await getStudentProfile(req.user.id);
  res.json({ user });
});

const dashboard = asyncHandler(async (req, res) => {
  const data = await getStudentDashboard(req.user.id);
  res.json(data);
});

const assessmentHistory = asyncHandler(async (req, res) => {
  const data = await getStudentAssessmentHistory(req.user.id);
  res.json({ items: data });
});

module.exports = { profile, consent, dashboard, assessmentHistory };