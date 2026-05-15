const { query } = require('../database/pool');
const ApiError = require('../utils/apiError');
const { getLatestAssessment, getStudentAssessmentHistory } = require('./assessmentService');

async function getStudentProfile(studentId) {
  const rows = await query(
    `SELECT id, student_id AS studentId, name, email, college, year_level AS yearLevel, sex, consent_flag AS consentFlag, consent_at AS consentAt
     FROM students
     WHERE id = ?`,
    [studentId]
  );

  if (!rows.length) {
    throw new ApiError(404, 'Student profile not found');
  }

  return rows[0];
}

async function acceptConsent(studentId) {
  const rows = await query('UPDATE students SET consent_flag = 1, consent_at = NOW() WHERE id = ?', [studentId]);
  return rows;
}

async function getStudentDashboard(studentId) {
  const profile = await getStudentProfile(studentId);
  const latestAssessment = await getLatestAssessment(studentId);
  const history = await getStudentAssessmentHistory(studentId);

  const riskRows = await query(
    `SELECT rc.risk_level AS riskLevel, COUNT(*) AS total
     FROM risk_classifications rc
     JOIN assessments a ON a.id = rc.assessment_id
     WHERE a.student_id = ?
     GROUP BY rc.risk_level`,
    [studentId]
  );

  const recentAppointments = await query(
    `SELECT id, purpose, scheduled_at AS scheduledAt, status
     FROM appointments
     WHERE student_id = ?
     ORDER BY scheduled_at ASC
     LIMIT 3`,
    [studentId]
  );

  const upcomingAction = latestAssessment ? latestAssessment.recommendation : 'Complete your first wellness assessment.';

  const summarizedRisk = latestAssessment ? latestAssessment.riskLevel : 'low';

  return {
    profile,
    latestRiskLevel: summarizedRisk,
    wellnessSummary: latestAssessment || null,
    assessmentHistory: history,
    riskTimeline: riskRows,
    upcomingAppointments: recentAppointments,
    nextRecommendedAction: upcomingAction
  };
}

module.exports = { getStudentProfile, acceptConsent, getStudentDashboard };