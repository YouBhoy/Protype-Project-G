const { query } = require('../database/pool');

const SCORE_MAX = {
  dass21: 126,
  phq9: 27,
  gad7: 21,
  esm: 20
};

const RISK_WEIGHT = {
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4
};

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toDateKey(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function safeDiv(numerator, denominator) {
  if (!denominator) {
    return 0;
  }
  return numerator / denominator;
}

function average(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDeviation(values) {
  if (values.length <= 1) {
    return 0;
  }

  const mean = average(values);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function normalizeScore(assessmentType, totalScore) {
  const key = String(assessmentType || '').toLowerCase();
  const maxScore = SCORE_MAX[key] || 100;
  return Math.max(0, Math.min(1, safeDiv(toNumber(totalScore), maxScore)));
}

function evaluateBinaryMetrics(samples) {
  if (!samples.length) {
    return {
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1: 0,
      support: 0
    };
  }

  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  samples.forEach((item) => {
    const predicted = item.probability >= 0.5 ? 1 : 0;
    const actual = item.label;

    if (predicted === 1 && actual === 1) {
      tp += 1;
    } else if (predicted === 1 && actual === 0) {
      fp += 1;
    } else if (predicted === 0 && actual === 0) {
      tn += 1;
    } else {
      fn += 1;
    }
  });

  const precision = safeDiv(tp, tp + fp);
  const recall = safeDiv(tp, tp + fn);

  return {
    accuracy: safeDiv(tp + tn, samples.length),
    precision,
    recall,
    f1: safeDiv(2 * precision * recall, precision + recall),
    support: samples.length
  };
}

function buildFeatureRows(assessmentRows) {
  const sorted = [...assessmentRows].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  const previousByStudent = new Map();
  const featureRows = [];
  const latestByStudent = new Map();

  sorted.forEach((row) => {
    const studentKey = row.studentDbId;
    const previous = previousByStudent.get(studentKey);

    const normalizedScore = normalizeScore(row.assessmentType, row.totalScore);
    const normalizedStress = row.stressScore == null ? normalizedScore : Math.max(0, Math.min(1, safeDiv(toNumber(row.stressScore), 5)));
    const normalizedMoodInverse = row.moodScore == null ? normalizedScore : Math.max(0, Math.min(1, safeDiv(6 - toNumber(row.moodScore), 5)));
    const normalizedEnergyInverse = row.energyScore == null ? normalizedScore : Math.max(0, Math.min(1, safeDiv(6 - toNumber(row.energyScore), 5)));
    const normalizedSleepInverse = row.sleepScore == null ? normalizedScore : Math.max(0, Math.min(1, safeDiv(6 - toNumber(row.sleepScore), 5)));
    const deltaScore = previous ? normalizedScore - previous.normalizedScore : 0;
    const recencyDays = previous
      ? Math.max(0, (new Date(row.submittedAt) - new Date(previous.submittedAt)) / (1000 * 60 * 60 * 24))
      : 30;
    const normalizedRecency = Math.max(0, Math.min(1, safeDiv(recencyDays, 30)));

    const features = [
      1,
      normalizedScore,
      normalizedStress,
      normalizedMoodInverse,
      normalizedEnergyInverse,
      normalizedSleepInverse,
      deltaScore,
      normalizedRecency
    ];

    const label = ['high', 'critical'].includes(String(row.riskLevel || '').toLowerCase()) ? 1 : 0;

    const featureRow = {
      studentDbId: row.studentDbId,
      studentId: row.studentId,
      studentName: row.studentName,
      riskLevel: row.riskLevel,
      submittedAt: row.submittedAt,
      label,
      normalizedScore,
      features
    };

    featureRows.push(featureRow);
    previousByStudent.set(studentKey, { submittedAt: row.submittedAt, normalizedScore });
    latestByStudent.set(studentKey, featureRow);
  });

  return {
    featureRows,
    latestRows: Array.from(latestByStudent.values())
  };
}

function trainLogisticRegression(samples) {
  if (!samples.length) {
    return { weights: [], trainingMetrics: evaluateBinaryMetrics([]), validationMetrics: evaluateBinaryMetrics([]) };
  }

  const splitIndex = samples.length >= 10 ? Math.floor(samples.length * 0.8) : samples.length;
  const training = samples.slice(0, splitIndex);
  const validation = samples.slice(splitIndex);

  const featureCount = training[0].features.length;
  const weights = Array(featureCount).fill(0);
  const learningRate = 0.35;
  const iterations = 450;
  const regularization = 0.0025;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const gradients = Array(featureCount).fill(0);

    training.forEach((sample) => {
      const linear = sample.features.reduce((sum, value, index) => sum + value * weights[index], 0);
      const prediction = sigmoid(linear);
      const error = prediction - sample.label;

      sample.features.forEach((value, index) => {
        gradients[index] += error * value;
      });
    });

    for (let index = 0; index < featureCount; index += 1) {
      const gradient = safeDiv(gradients[index], training.length) + regularization * weights[index];
      weights[index] -= learningRate * gradient;
    }
  }

  const withProbabilities = (rows) => rows.map((row) => ({
    ...row,
    probability: sigmoid(row.features.reduce((sum, value, index) => sum + value * weights[index], 0))
  }));

  const trainingPredictions = withProbabilities(training);
  const validationPredictions = validation.length ? withProbabilities(validation) : trainingPredictions;

  return {
    weights,
    trainingMetrics: evaluateBinaryMetrics(trainingPredictions),
    validationMetrics: evaluateBinaryMetrics(validationPredictions)
  };
}

function trainBoostedStumps(samples) {
  if (!samples.length) {
    return {
      baseScore: 0,
      stumps: [],
      featureImportance: {},
      validationMetrics: evaluateBinaryMetrics([])
    };
  }

  const splitIndex = samples.length >= 10 ? Math.floor(samples.length * 0.8) : samples.length;
  const training = samples.slice(0, splitIndex);
  const validation = samples.slice(splitIndex);

  const baseRate = Math.max(0.01, Math.min(0.99, average(training.map((sample) => sample.label))));
  const baseScore = Math.log(baseRate / (1 - baseRate));
  const scores = training.map(() => baseScore);
  const stumps = [];
  const rounds = 8;
  const eta = 0.6;
  const lambda = 1;
  const featureImportance = {};

  const predictSingle = (features) => {
    let score = baseScore;
    stumps.forEach((stump) => {
      score += features[stump.featureIndex] <= stump.threshold ? stump.leftValue : stump.rightValue;
    });
    return sigmoid(score);
  };

  for (let round = 0; round < rounds; round += 1) {
    const residuals = training.map((sample, index) => sample.label - sigmoid(scores[index]));

    let best = null;
    const featureCount = training[0].features.length;
    for (let featureIndex = 1; featureIndex < featureCount; featureIndex += 1) {
      const values = training.map((sample) => sample.features[featureIndex]).sort((a, b) => a - b);
      const quantiles = [0.2, 0.4, 0.6, 0.8].map((q) => values[Math.floor((values.length - 1) * q)]);

      quantiles.forEach((threshold) => {
        const leftIndexes = [];
        const rightIndexes = [];

        training.forEach((sample, index) => {
          if (sample.features[featureIndex] <= threshold) {
            leftIndexes.push(index);
          } else {
            rightIndexes.push(index);
          }
        });

        if (!leftIndexes.length || !rightIndexes.length) {
          return;
        }

        const leftResidualSum = leftIndexes.reduce((sum, index) => sum + residuals[index], 0);
        const rightResidualSum = rightIndexes.reduce((sum, index) => sum + residuals[index], 0);
        const gain = ((leftResidualSum ** 2) / (leftIndexes.length + lambda))
          + ((rightResidualSum ** 2) / (rightIndexes.length + lambda));

        if (!best || gain > best.gain) {
          best = {
            gain,
            featureIndex,
            threshold,
            leftIndexes,
            rightIndexes,
            leftResidualSum,
            rightResidualSum
          };
        }
      });
    }

    if (!best) {
      break;
    }

    const leftValue = eta * (best.leftResidualSum / (best.leftIndexes.length + lambda));
    const rightValue = eta * (best.rightResidualSum / (best.rightIndexes.length + lambda));

    const stump = {
      featureIndex: best.featureIndex,
      threshold: best.threshold,
      leftValue,
      rightValue
    };

    stumps.push(stump);
    featureImportance[best.featureIndex] = toNumber(featureImportance[best.featureIndex]) + Math.abs(leftValue - rightValue);

    training.forEach((sample, index) => {
      scores[index] += sample.features[best.featureIndex] <= best.threshold ? leftValue : rightValue;
    });
  }

  const validationRows = validation.length ? validation : training;
  const validationPredictions = validationRows.map((sample) => ({
    ...sample,
    probability: predictSingle(sample.features)
  }));

  return {
    baseScore,
    stumps,
    featureImportance,
    validationMetrics: evaluateBinaryMetrics(validationPredictions),
    predictSingle
  };
}

function generateDescriptiveAnalytics(assessmentRows, latestRows) {
  const cohortBuckets = new Map();

  latestRows.forEach((row) => {
    const key = [row.college || 'Unknown', row.yearLevel || 'Unknown', row.sex || 'Unknown', row.academicProgram || row.college || 'General'].join('|');
    if (!cohortBuckets.has(key)) {
      cohortBuckets.set(key, {
        cohort: key,
        college: row.college || 'Unknown',
        yearLevel: row.yearLevel || 'Unknown',
        sex: row.sex || 'Unknown',
        academicProgram: row.academicProgram || row.college || 'General',
        totalStudents: 0,
        meanScore: 0,
        riskLow: 0,
        riskModerate: 0,
        riskHigh: 0,
        riskCrisis: 0
      });
    }

    const bucket = cohortBuckets.get(key);
    bucket.totalStudents += 1;
    bucket.meanScore += toNumber(row.totalScore);

    if (row.riskLevel === 'low') {
      bucket.riskLow += 1;
    } else if (row.riskLevel === 'moderate') {
      bucket.riskModerate += 1;
    } else if (row.riskLevel === 'high') {
      bucket.riskHigh += 1;
    } else if (row.riskLevel === 'critical') {
      bucket.riskCrisis += 1;
    }
  });

  const cohorts = Array.from(cohortBuckets.values())
    .map((bucket) => ({
      ...bucket,
      meanScore: Number(safeDiv(bucket.meanScore, bucket.totalStudents).toFixed(2))
    }))
    .sort((a, b) => b.totalStudents - a.totalStudents);

  const entriesByDate = new Map();
  assessmentRows.forEach((row) => {
    const date = toDateKey(row.submittedAt);
    if (!entriesByDate.has(date)) {
      entriesByDate.set(date, []);
    }
    entriesByDate.get(date).push(toNumber(row.totalScore));
  });

  const timeline = Array.from(entriesByDate.keys()).sort();
  const rollingWindows = timeline.map((date) => {
    const end = new Date(`${date}T00:00:00Z`).getTime();

    const aggregateInWindow = (days) => {
      const start = end - ((days - 1) * 24 * 60 * 60 * 1000);
      const values = [];
      entriesByDate.forEach((scores, dateKey) => {
        const current = new Date(`${dateKey}T00:00:00Z`).getTime();
        if (current >= start && current <= end) {
          values.push(...scores);
        }
      });
      return Number(average(values).toFixed(2));
    };

    return {
      date,
      avg7: aggregateInWindow(7),
      avg14: aggregateInWindow(14),
      avg30: aggregateInWindow(30)
    };
  });

  const esmRows = assessmentRows.filter((row) => row.moodScore != null && row.energyScore != null && row.stressScore != null);
  const studentMetricBaselines = new Map();

  esmRows.forEach((row) => {
    if (!studentMetricBaselines.has(row.studentDbId)) {
      studentMetricBaselines.set(row.studentDbId, {
        mood: [],
        stress: [],
        energy: []
      });
    }
    const bucket = studentMetricBaselines.get(row.studentDbId);
    bucket.mood.push(toNumber(row.moodScore));
    bucket.stress.push(toNumber(row.stressScore));
    bucket.energy.push(toNumber(row.energyScore));
  });

  const baselineStats = new Map();
  studentMetricBaselines.forEach((value, studentDbId) => {
    baselineStats.set(studentDbId, {
      mood: { mean: average(value.mood), std: stdDeviation(value.mood) },
      stress: { mean: average(value.stress), std: stdDeviation(value.stress) },
      energy: { mean: average(value.energy), std: stdDeviation(value.energy) }
    });
  });

  const anomalies = [];
  const controlSeries = {
    mood: [],
    stress: [],
    energy: []
  };
  const controlByDate = new Map();

  esmRows.forEach((row) => {
    const date = toDateKey(row.submittedAt);
    if (!controlByDate.has(date)) {
      controlByDate.set(date, {
        mood: [],
        stress: [],
        energy: []
      });
    }

    const byDate = controlByDate.get(date);
    byDate.mood.push(toNumber(row.moodScore));
    byDate.stress.push(toNumber(row.stressScore));
    byDate.energy.push(toNumber(row.energyScore));

    const baseline = baselineStats.get(row.studentDbId);
    if (!baseline) {
      return;
    }

    ['mood', 'stress', 'energy'].forEach((metric) => {
      const rawValue = toNumber(row[`${metric}Score`]);
      const metricBaseline = baseline[metric];
      const zScore = metricBaseline.std > 0 ? (rawValue - metricBaseline.mean) / metricBaseline.std : 0;

      if (Math.abs(zScore) >= 2) {
        anomalies.push({
          studentId: row.studentId,
          studentName: row.studentName,
          metric,
          value: rawValue,
          baseline: Number(metricBaseline.mean.toFixed(2)),
          zScore: Number(zScore.toFixed(2)),
          date
        });
      }
    });
  });

  const sortedControlDates = Array.from(controlByDate.keys()).sort();
  ['mood', 'stress', 'energy'].forEach((metric) => {
    const allValues = [];
    sortedControlDates.forEach((date) => {
      const values = controlByDate.get(date)[metric];
      allValues.push(...values);
    });

    const metricMean = average(allValues);
    const metricStd = stdDeviation(allValues);
    const ucl = metricMean + (2 * metricStd);
    const lcl = Math.max(0, metricMean - (2 * metricStd));

    controlSeries[metric] = sortedControlDates.map((date) => ({
      date,
      value: Number(average(controlByDate.get(date)[metric]).toFixed(2)),
      baseline: Number(metricMean.toFixed(2)),
      ucl: Number(ucl.toFixed(2)),
      lcl: Number(lcl.toFixed(2))
    }));
  });

  const riskCounts = {
    low: 0,
    moderate: 0,
    high: 0,
    critical: 0
  };

  latestRows.forEach((row) => {
    const normalized = String(row.riskLevel || '').toLowerCase();
    if (riskCounts[normalized] != null) {
      riskCounts[normalized] += 1;
    }
  });

  return {
    cohortAnalysis: cohorts,
    rollingWindows,
    controlCharts: {
      mood: controlSeries.mood,
      stress: controlSeries.stress,
      energy: controlSeries.energy,
      anomalies: anomalies
        .sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
        .slice(0, 16)
    },
    riskDistributionDashboard: [
      { riskLevel: 'LOW', total: riskCounts.low },
      { riskLevel: 'MODERATE', total: riskCounts.moderate },
      { riskLevel: 'HIGH', total: riskCounts.high },
      { riskLevel: 'CRISIS', total: riskCounts.critical }
    ]
  };
}

function generatePredictiveAnalytics(assessmentRows) {
  const { featureRows, latestRows } = buildFeatureRows(assessmentRows);

  if (!featureRows.length) {
    return {
      logisticRegression: {
        metrics: evaluateBinaryMetrics([]),
        coefficients: []
      },
      xgboost: {
        metrics: evaluateBinaryMetrics([]),
        featureImportance: []
      },
      shap: {
        globalImpact: [],
        studentExplanations: []
      },
      predictions: []
    };
  }

  const logistic = trainLogisticRegression(featureRows);
  const xgb = trainBoostedStumps(featureRows);
  const xgbPredictSingle = xgb.predictSingle || ((features) => sigmoid(xgb.baseScore + features[1]));

  const featureNames = [
    'bias',
    'normalized_score',
    'stress_signal',
    'low_mood_signal',
    'low_energy_signal',
    'low_sleep_signal',
    'score_delta',
    'assessment_gap'
  ];

  const predictions = latestRows.map((row) => {
    const logisticProbability = logistic.weights.length
      ? sigmoid(row.features.reduce((sum, value, index) => sum + value * logistic.weights[index], 0))
      : 0;
    const xgboostProbability = xgbPredictSingle(row.features);

    const logisticContributions = row.features
      .map((value, index) => ({
        feature: featureNames[index],
        contribution: Number((value * toNumber(logistic.weights[index])).toFixed(4))
      }))
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    const shapContributions = (xgb.stumps || []).map((stump) => {
      const contribution = row.features[stump.featureIndex] <= stump.threshold ? stump.leftValue : stump.rightValue;
      return {
        feature: featureNames[stump.featureIndex],
        contribution: Number(contribution.toFixed(4))
      };
    });

    return {
      studentDbId: row.studentDbId,
      studentId: row.studentId,
      studentName: row.studentName,
      riskLevel: row.riskLevel,
      submittedAt: row.submittedAt,
      logisticProbability: Number(logisticProbability.toFixed(4)),
      xgboostProbability: Number(xgboostProbability.toFixed(4)),
      logisticTopFactors: logisticContributions.slice(0, 3),
      shapTopFactors: shapContributions
        .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
        .slice(0, 3)
    };
  });

  const globalShapMap = {};
  predictions.forEach((prediction) => {
    prediction.shapTopFactors.forEach((factor) => {
      globalShapMap[factor.feature] = toNumber(globalShapMap[factor.feature]) + Math.abs(factor.contribution);
    });
  });

  return {
    logisticRegression: {
      metrics: logistic.validationMetrics,
      coefficients: featureNames.map((feature, index) => ({
        feature,
        weight: Number(toNumber(logistic.weights[index]).toFixed(4))
      }))
    },
    xgboost: {
      metrics: xgb.validationMetrics,
      featureImportance: Object.entries(xgb.featureImportance || {})
        .map(([featureIndex, importance]) => ({
          feature: featureNames[Number(featureIndex)],
          importance: Number(toNumber(importance).toFixed(4))
        }))
        .sort((a, b) => b.importance - a.importance)
    },
    shap: {
      globalImpact: Object.entries(globalShapMap)
        .map(([feature, impact]) => ({ feature, impact: Number(toNumber(impact).toFixed(4)) }))
        .sort((a, b) => b.impact - a.impact),
      studentExplanations: predictions.map((item) => ({
        studentId: item.studentId,
        studentName: item.studentName,
        factors: item.shapTopFactors
      }))
    },
    predictions: predictions.sort((a, b) => b.xgboostProbability - a.xgboostProbability)
  };
}

function generatePrescriptiveAnalytics(latestRows, predictiveAnalytics, descriptiveAnalytics) {
  const anomaliesByStudent = new Map();
  (descriptiveAnalytics.controlCharts.anomalies || []).forEach((item) => {
    if (!anomaliesByStudent.has(item.studentId)) {
      anomaliesByStudent.set(item.studentId, []);
    }
    anomaliesByStudent.get(item.studentId).push(item);
  });

  const predictionMap = new Map();
  (predictiveAnalytics.predictions || []).forEach((prediction) => {
    predictionMap.set(prediction.studentDbId, prediction);
  });

  const decisionTreeOutcomes = {
    immediateReferral: 0,
    urgentOutreach: 0,
    structuredFollowUp: 0,
    routineMonitoring: 0
  };

  const interventions = latestRows.map((student) => {
    const prediction = predictionMap.get(student.studentDbId);
    const probability = prediction ? prediction.xgboostProbability : 0;
    const risk = String(student.riskLevel || '').toLowerCase();
    const anomalyCount = (anomaliesByStudent.get(student.studentId) || []).length;

    let decisionPath = '';
    let recommendedAction = '';
    let urgency = '';

    if (risk === 'critical' || probability >= 0.8) {
      decisionPath = 'Risk is critical OR model probability >= 0.80';
      recommendedAction = 'Initiate immediate crisis referral and same-day facilitator contact.';
      urgency = 'IMMEDIATE';
      decisionTreeOutcomes.immediateReferral += 1;
    } else if (risk === 'high' || probability >= 0.65 || anomalyCount >= 2) {
      decisionPath = 'Risk is high OR model probability >= 0.65 OR repeated control-chart anomalies.';
      recommendedAction = 'Schedule urgent outreach within 24 hours and lock next counselor slot.';
      urgency = 'HIGH';
      decisionTreeOutcomes.urgentOutreach += 1;
    } else if (risk === 'moderate' || probability >= 0.45) {
      decisionPath = 'Risk is moderate OR model probability >= 0.45';
      recommendedAction = 'Create structured follow-up plan with weekly check-ins.';
      urgency = 'MEDIUM';
      decisionTreeOutcomes.structuredFollowUp += 1;
    } else {
      decisionPath = 'Risk remains low and model probability < 0.45';
      recommendedAction = 'Continue routine wellness monitoring and monthly touchpoint.';
      urgency = 'LOW';
      decisionTreeOutcomes.routineMonitoring += 1;
    }

    return {
      studentDbId: student.studentDbId,
      studentId: student.studentId,
      studentName: student.studentName,
      riskLevel: student.riskLevel,
      probability: Number(probability.toFixed(4)),
      anomalyCount,
      decisionPath,
      recommendedAction,
      urgency,
      facilitatorSupervisionRequired: true
    };
  });

  return {
    decisionTree: {
      outcomes: decisionTreeOutcomes,
      pathways: interventions.slice().sort((a, b) => b.probability - a.probability)
    },
    ruleBasedInterventionEngine: {
      supervised: true,
      recommendations: interventions.slice().sort((a, b) => {
        const urgencyWeight = { IMMEDIATE: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
      })
    }
  };
}

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
  const studentsInScope = await query(
    `SELECT id, student_id AS studentId, name AS studentName, college, year_level AS yearLevel, sex, consent_flag AS consentFlag
     FROM students
     WHERE college = ?`,
    [assignedCollege]
  );

  const assessmentRows = await query(
    `SELECT
      a.id AS assessmentId,
      a.student_id AS studentDbId,
      s.student_id AS studentId,
      s.name AS studentName,
      s.college,
      s.year_level AS yearLevel,
      s.sex,
      s.college AS academicProgram,
      s.consent_flag AS consentFlag,
      a.assessment_type AS assessmentType,
      a.total_score AS totalScore,
      COALESCE(rc.risk_level, a.risk_level) AS riskLevel,
      a.submitted_at AS submittedAt,
      e.mood_score AS moodScore,
      e.energy_score AS energyScore,
      e.stress_score AS stressScore,
      e.sleep_score AS sleepScore
     FROM assessments a
     JOIN students s ON s.id = a.student_id
     LEFT JOIN risk_classifications rc ON rc.assessment_id = a.id
     LEFT JOIN esm_entries e ON e.assessment_id = a.id
     WHERE s.college = ?
     ORDER BY a.submitted_at ASC`,
    [assignedCollege]
  );

  const latestByStudent = new Map();
  assessmentRows.forEach((row) => {
    latestByStudent.set(row.studentDbId, row);
  });

  const latestRows = Array.from(latestByStudent.values());
  const totalStudents = studentsInScope.length;
  const highRiskCount = latestRows.filter((row) => String(row.riskLevel || '').toLowerCase() === 'high').length;
  const criticalCount = latestRows.filter((row) => String(row.riskLevel || '').toLowerCase() === 'critical').length;

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

  const descriptiveAnalytics = generateDescriptiveAnalytics(assessmentRows, latestRows);
  const predictiveAnalytics = generatePredictiveAnalytics(assessmentRows);
  const prescriptiveAnalytics = generatePrescriptiveAnalytics(latestRows, predictiveAnalytics, descriptiveAnalytics);

  const riskDistribution = descriptiveAnalytics.riskDistributionDashboard.map((item) => ({
    riskLevel: item.riskLevel.toLowerCase() === 'crisis' ? 'critical' : item.riskLevel.toLowerCase(),
    total: item.total
  }));

  const metadata = {
    source: 'submitted_assessment_forms',
    syncedAt: new Date().toISOString(),
    descriptiveReferences: [
      'Myin-Germeys et al. (2022)',
      'Torous et al. (2020)',
      'Montgomery (2019)',
      'Davenport & Harris (2017)'
    ],
    predictiveReferences: [
      'Hosmer, Lemeshow, & Sturdivant (2013)',
      'Chen & Guestrin (2016)',
      'Shatte, Hutchinson, & Teague (2019)',
      'Lundberg & Lee (2017)'
    ],
    prescriptiveReferences: [
      'Quinlan (1986)',
      'Obermeyer & Emanuel (2021)'
    ]
  };

  return {
    totals: {
      totalStudents,
      highRiskCount,
      criticalCount
    },
    riskDistribution,
    recentAssessments,
    appointmentRequests,
    wellnessTrajectory,
    criticalAlerts,
    descriptiveAnalytics,
    predictiveAnalytics,
    prescriptiveAnalytics,
    metadata
  };
}

module.exports = { getStudentAnalytics, getFacilitatorDashboard };