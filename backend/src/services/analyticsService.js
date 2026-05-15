const { query } = require('../database/pool');

async function getStudentAnalytics(studentId) {
  const riskHistory = await query(
    `SELECT DATE(submitted_at) AS date, risk_level AS riskLevel, total_score AS totalScore
     FROM assessments
     WHERE student_id = ?
     ORDER BY submitted_at ASC`,
    [studentId]
  );

  const moodTrend = await query(
    `SELECT DATE(submitted_at) AS date, AVG(total_score) AS value
     FROM assessments
     WHERE student_id = ? AND assessment_type IN ('esm', 'phq9', 'gad7', 'dass21')
     GROUP BY DATE(submitted_at)
     ORDER BY DATE(submitted_at) ASC`,
    [studentId]
  );

  const assessmentBreakdown = await query(
    `SELECT assessment_type AS assessmentType, COUNT(*) AS total
     FROM assessments
     WHERE student_id = ?
     GROUP BY assessment_type`,
    [studentId]
  );

  return { riskHistory, moodTrend, assessmentBreakdown };
}

async function getFacilitatorDashboard(facilitatorId, assignedCollege) {
  const totals = await query(
    `SELECT
       COUNT(DISTINCT s.id) AS totalStudents,
       SUM(CASE WHEN rc.risk_level = 'high' THEN 1 ELSE 0 END) AS highRiskCount,
       SUM(CASE WHEN rc.risk_level = 'critical' THEN 1 ELSE 0 END) AS criticalCount
     FROM students s
     LEFT JOIN assessments a ON a.student_id = s.id
     LEFT JOIN risk_classifications rc ON rc.assessment_id = a.id
     WHERE s.college = ?`,
    [assignedCollege]
  );

  const riskDistribution = await query(
    `SELECT rc.risk_level AS riskLevel, COUNT(*) AS total
     FROM students s
     JOIN assessments a ON a.student_id = s.id
     JOIN risk_classifications rc ON rc.assessment_id = a.id
     WHERE s.college = ?
     GROUP BY rc.risk_level`,
    [assignedCollege]
  );

  const recentAssessments = await query(
    `SELECT a.id, s.student_id AS studentId, s.name AS studentName, a.assessment_type AS assessmentType,
            a.total_score AS totalScore, a.risk_level AS riskLevel, a.submitted_at AS submittedAt, s.consent_flag AS consentFlag
     FROM assessments a
     JOIN students s ON s.id = a.student_id
     WHERE s.college = ?
     ORDER BY a.submitted_at DESC
     LIMIT 8`,
    [assignedCollege]
  );

  const appointmentRequests = await query(
    `SELECT a.id, a.purpose, a.scheduled_at AS scheduledAt, a.status, s.student_id AS studentId, s.name AS studentName, s.consent_flag AS consentFlag
     FROM appointments a
     JOIN students s ON s.id = a.student_id
     WHERE a.facilitator_id = ?
     ORDER BY a.created_at DESC
     LIMIT 8`,
    [facilitatorId]
  );

  const wellnessTrajectory = await query(
    `SELECT DATE(a.submitted_at) AS date, AVG(a.total_score) AS averageScore
     FROM assessments a
     JOIN students s ON s.id = a.student_id
     WHERE s.college = ?
     GROUP BY DATE(a.submitted_at)
     ORDER BY DATE(a.submitted_at) ASC`,
    [assignedCollege]
  );

  const criticalAlerts = await query(
    `SELECT a.id, s.student_id AS studentId, s.name AS studentName, a.assessment_type AS assessmentType,
            a.total_score AS totalScore, a.risk_level AS riskLevel, a.recommendation, a.submitted_at AS submittedAt
     FROM assessments a
     JOIN students s ON s.id = a.student_id
     WHERE s.college = ? AND a.risk_level IN ('high', 'critical')
     ORDER BY a.submitted_at DESC
     LIMIT 10`,
    [assignedCollege]
  );

  return {
    totals: totals[0],
    riskDistribution,
    recentAssessments,
    appointmentRequests,
    wellnessTrajectory,
    criticalAlerts
  };
}

module.exports = { getStudentAnalytics, getFacilitatorDashboard };