function getRiskRecommendation(riskLevel) {
  switch (riskLevel) {
    case 'critical':
      return 'Immediate counselor outreach and safety check required.';
    case 'high':
      return 'Prioritize counseling follow-up within 24 hours.';
    case 'moderate':
      return 'Recommend supportive counseling and self-help resources.';
    default:
      return 'Continue routine wellness monitoring.';
  }
}

function normalizeRiskLevel(score, thresholds) {
  if (score >= thresholds.critical) {
    return 'critical';
  }

  if (score >= thresholds.high) {
    return 'high';
  }

  if (score >= thresholds.moderate) {
    return 'moderate';
  }

  return 'low';
}

module.exports = { getRiskRecommendation, normalizeRiskLevel };