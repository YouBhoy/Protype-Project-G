const { query, transaction } = require('../database/pool');
const ApiError = require('../utils/apiError');
const { getRiskRecommendation, normalizeRiskLevel } = require('../utils/risk');
const { getAssessmentDefinition, listAssessmentCatalog } = require('./assessmentCatalog');

function validateArrayResponses(responses, expectedLength, min, max) {
  if (!Array.isArray(responses) || responses.length !== expectedLength) {
    throw new ApiError(400, `Exactly ${expectedLength} responses are required`);
  }

  responses.forEach((value, index) => {
    if (!Number.isInteger(Number(value))) {
      throw new ApiError(400, `Response ${index + 1} must be a whole number`);
    }

    const numeric = Number(value);
    if (numeric < min || numeric > max) {
      throw new ApiError(400, `Response ${index + 1} must be between ${min} and ${max}`);
    }
  });
}

function validateEsmResponses(responses) {
  const fields = ['mood', 'energy', 'stress', 'sleep'];
  fields.forEach((field) => {
    if (!Number.isInteger(Number(responses?.[field]))) {
      throw new ApiError(400, `Field ${field} is required and must be a whole number`);
    }
    const numeric = Number(responses[field]);
    if (numeric < 1 || numeric > 5) {
      throw new ApiError(400, `Field ${field} must be between 1 and 5`);
    }
  });
}

function scoreAssessment(type, responses) {
  const normalizedType = String(type || '').toLowerCase();

  if (normalizedType === 'dass21') {
    validateArrayResponses(responses, 21, 0, 3);
    const rawScore = responses.reduce((sum, value) => sum + Number(value), 0) * 2;
    const riskLevel = normalizeRiskLevel(rawScore, { moderate: 30, high: 60, critical: 90 });
    return {
      totalScore: rawScore,
      riskLevel,
      recommendation: getRiskRecommendation(riskLevel)
    };
  }

  if (normalizedType === 'phq9') {
    validateArrayResponses(responses, 9, 0, 3);
    const rawScore = responses.reduce((sum, value) => sum + Number(value), 0);
    const riskLevel = normalizeRiskLevel(rawScore, { moderate: 5, high: 10, critical: 15 });
    return {
      totalScore: rawScore,
      riskLevel,
      recommendation: getRiskRecommendation(riskLevel)
    };
  }

  if (normalizedType === 'gad7') {
    validateArrayResponses(responses, 7, 0, 3);
    const rawScore = responses.reduce((sum, value) => sum + Number(value), 0);
    const riskLevel = normalizeRiskLevel(rawScore, { moderate: 5, high: 10, critical: 15 });
    return {
      totalScore: rawScore,
      riskLevel,
      recommendation: getRiskRecommendation(riskLevel)
    };
  }

  if (normalizedType === 'esm') {
    validateEsmResponses(responses);
    const mood = Number(responses.mood);
    const energy = Number(responses.energy);
    const stress = Number(responses.stress);
    const sleep = Number(responses.sleep);
    const totalScore = stress + (6 - mood) + (6 - energy) + (6 - sleep);
    const riskLevel = normalizeRiskLevel(totalScore, { moderate: 8, high: 11, critical: 14 });
    return {
      totalScore,
      riskLevel,
      recommendation: getRiskRecommendation(riskLevel)
    };
  }

  throw new ApiError(404, 'Unknown assessment type');
}

async function submitAssessment(studentId, type, responses) {
  const definition = getAssessmentDefinition(type);
  if (!definition) {
    throw new ApiError(404, 'Assessment type not found');
  }

  const studentRows = await query('SELECT * FROM students WHERE id = ?', [studentId]);
  if (!studentRows.length) {
    throw new ApiError(404, 'Student profile not found');
  }

  if (!studentRows[0].consent_flag) {
    throw new ApiError(403, 'Consent is required before assessments can be submitted');
  }

  const scoring = scoreAssessment(type, responses);

  const result = await transaction(async (connection) => {
    const assessmentResult = await connection.execute(
      `INSERT INTO assessments (student_id, assessment_type, total_score, risk_level, recommendation)
       VALUES (?, ?, ?, ?, ?)`,
      [studentId, definition.key, scoring.totalScore, scoring.riskLevel, scoring.recommendation]
    );

    const assessmentId = assessmentResult[0].insertId;

    if (definition.key === 'dass21') {
      await connection.execute('INSERT INTO dass21_responses (assessment_id, responses_json) VALUES (?, ?)', [assessmentId, JSON.stringify(responses)]);
    } else if (definition.key === 'phq9') {
      await connection.execute('INSERT INTO phq9_responses (assessment_id, responses_json) VALUES (?, ?)', [assessmentId, JSON.stringify(responses)]);
    } else if (definition.key === 'gad7') {
      await connection.execute('INSERT INTO gad7_responses (assessment_id, responses_json) VALUES (?, ?)', [assessmentId, JSON.stringify(responses)]);
    } else if (definition.key === 'esm') {
      await connection.execute(
        'INSERT INTO esm_entries (assessment_id, mood_score, energy_score, stress_score, sleep_score) VALUES (?, ?, ?, ?, ?)',
        [assessmentId, Number(responses.mood), Number(responses.energy), Number(responses.stress), Number(responses.sleep)]
      );
    }

    await connection.execute(
      'INSERT INTO risk_classifications (student_id, assessment_id, risk_level, risk_reason) VALUES (?, ?, ?, ?)',
      [studentId, assessmentId, scoring.riskLevel, scoring.recommendation]
    );

    return { assessmentId };
  });

  return {
    id: result.assessmentId,
    assessmentType: definition.key,
    ...scoring
  };
}

async function getStudentAssessmentHistory(studentId) {
  return query(
    `SELECT assessment_type AS assessmentType, total_score AS totalScore, risk_level AS riskLevel,
            recommendation, submitted_at AS submittedAt
     FROM assessments
     WHERE student_id = ?
     ORDER BY submitted_at DESC`,
    [studentId]
  );
}

async function getLatestAssessment(studentId) {
  const rows = await query(
    `SELECT assessment_type AS assessmentType, total_score AS totalScore, risk_level AS riskLevel,
            recommendation, submitted_at AS submittedAt
     FROM assessments
     WHERE student_id = ?
     ORDER BY submitted_at DESC
     LIMIT 1`,
    [studentId]
  );

  return rows[0] || null;
}

async function getAssessmentCatalogForApi() {
  return listAssessmentCatalog();
}

module.exports = {
  submitAssessment,
  getStudentAssessmentHistory,
  getLatestAssessment,
  getAssessmentCatalogForApi,
  scoreAssessment
};