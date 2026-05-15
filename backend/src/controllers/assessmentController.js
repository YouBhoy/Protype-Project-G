const asyncHandler = require('../utils/asyncHandler');
const { submitAssessment, getAssessmentCatalogForApi } = require('../services/assessmentService');

const catalog = asyncHandler(async (req, res) => {
  const items = await getAssessmentCatalogForApi();
  res.json({ items });
});

const submit = asyncHandler(async (req, res) => {
  const result = await submitAssessment(req.user.id, req.params.type, req.body.responses);
  res.status(201).json({ result });
});

module.exports = { catalog, submit };