const asyncHandler = require('../utils/asyncHandler');
const { getStudentAnalytics, getFacilitatorDashboard } = require('../services/analyticsService');

const studentAnalytics = asyncHandler(async (req, res) => {
  const data = await getStudentAnalytics(req.user.id);
  res.json(data);
});

const facilitatorDashboard = asyncHandler(async (req, res) => {
  const data = await getFacilitatorDashboard(req.user.id, req.user.assignedCollege);
  res.json(data);
});

module.exports = { studentAnalytics, facilitatorDashboard };