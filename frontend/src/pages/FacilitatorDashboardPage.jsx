import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { RiskBadge } from '../components/RiskBadge';
import { LineTrendChart } from '../components/charts/LineTrendChart';
import { DoughnutChart } from '../components/charts/DoughnutChart';
import { BarChart } from '../components/charts/BarChart';
import { MultiLineChart } from '../components/charts/MultiLineChart';
import { ChatButton } from '../components/ChatButton';
import { ChatPanel } from '../components/ChatPanel';
import { ConversationList } from '../components/ConversationList';
import { useAuth } from '../contexts/AuthContext';
import { initializeSocket } from '../socket';

export function FacilitatorDashboardPage() {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState('descriptive');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const dashboard = await api.get('/facilitator/dashboard');
      setData(dashboard);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard().catch(() => null);

    // Initialize Socket.io connection
    if (token) {
      initializeSocket(token);
    }
  }, [token]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard().catch(() => null);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setIsChatOpen(true);
  };

  const selectedConversationName = selectedConversation?.student_name
    || [selectedConversation?.first_name, selectedConversation?.last_name].filter(Boolean).join(' ')
    || 'Student';

  const descriptive = data?.descriptiveAnalytics || {};
  const predictive = data?.predictiveAnalytics || {};
  const prescriptive = data?.prescriptiveAnalytics || {};

  const cohortLabels = (descriptive.cohortAnalysis || []).slice(0, 8).map((item) => `${item.yearLevel} | ${item.sex}`);
  const cohortScores = (descriptive.cohortAnalysis || []).slice(0, 8).map((item) => Number(item.meanScore || 0));

  const rollingLabels = (descriptive.rollingWindows || []).map((item) => item.date);
  const rolling7 = (descriptive.rollingWindows || []).map((item) => Number(item.avg7 || 0));
  const rolling14 = (descriptive.rollingWindows || []).map((item) => Number(item.avg14 || 0));
  const rolling30 = (descriptive.rollingWindows || []).map((item) => Number(item.avg30 || 0));

  const controlMood = descriptive.controlCharts?.mood || [];
  const controlStress = descriptive.controlCharts?.stress || [];
  const controlEnergy = descriptive.controlCharts?.energy || [];

  const predictionBands = (predictive.predictions || []).reduce((accumulator, item) => {
    const value = Number(item.xgboostProbability || 0);
    if (value >= 0.8) {
      accumulator.crisis += 1;
    } else if (value >= 0.65) {
      accumulator.high += 1;
    } else if (value >= 0.45) {
      accumulator.moderate += 1;
    } else {
      accumulator.low += 1;
    }
    return accumulator;
  }, { low: 0, moderate: 0, high: 0, crisis: 0 });

  const logisticMetrics = predictive.logisticRegression?.metrics || {};
  const xgboostMetrics = predictive.xgboost?.metrics || {};

  const decisionOutcomes = prescriptive.decisionTree?.outcomes || {};
  const outcomeLabels = [
    'Immediate referral',
    'Urgent outreach',
    'Structured follow-up',
    'Routine monitoring'
  ];
  const outcomeValues = [
    Number(decisionOutcomes.immediateReferral || 0),
    Number(decisionOutcomes.urgentOutreach || 0),
    Number(decisionOutcomes.structuredFollowUp || 0),
    Number(decisionOutcomes.routineMonitoring || 0)
  ];

  const formatPercent = (value) => `${(Number(value || 0) * 100).toFixed(1)}%`;

  const renderDescriptive = () => (
    <>
      <section className="metrics-grid">
        <StatCard label="Cohorts tracked" value={(descriptive.cohortAnalysis || []).length} tone="primary" />
        <StatCard label="Anomalies detected" value={(descriptive.controlCharts?.anomalies || []).length} detail="Control-chart outliers vs baseline" tone="warning" />
        <StatCard label="Synced assessments" value={(data?.recentAssessments || []).length} detail="Newest records loaded in dashboard" tone="danger" />
      </section>

      <section className="chart-grid">
        <MultiLineChart
          title="Rolling wellness summaries (7/14/30 days)"
          labels={rollingLabels}
          datasets={[
            { label: '7-day', data: rolling7, borderColor: '#d2232a', backgroundColor: 'rgba(210,35,42,0.15)', fill: false, tension: 0.25 },
            { label: '14-day', data: rolling14, borderColor: '#0f766e', backgroundColor: 'rgba(15,118,110,0.15)', fill: false, tension: 0.25 },
            { label: '30-day', data: rolling30, borderColor: '#1d4ed8', backgroundColor: 'rgba(29,78,216,0.15)', fill: false, tension: 0.25 }
          ]}
        />
        <DoughnutChart
          title="Risk distribution dashboard"
          labels={(descriptive.riskDistributionDashboard || []).map((item) => item.riskLevel)}
          values={(descriptive.riskDistributionDashboard || []).map((item) => Number(item.total || 0))}
        />
      </section>

      <section className="chart-grid">
        <BarChart
          title="Cohort mean wellness score"
          labels={cohortLabels}
          values={cohortScores}
          horizontal
          seriesLabel="Mean score"
          color="#f59e0b"
        />
        <LineTrendChart
          title="Wellness trajectory"
          labels={data?.wellnessTrajectory?.map((item) => item.date) || []}
          values={data?.wellnessTrajectory?.map((item) => Number(item.averageScore)) || []}
          label="Average score"
        />
      </section>

      <section className="chart-grid">
        <MultiLineChart
          title="Control chart: Mood"
          labels={controlMood.map((item) => item.date)}
          datasets={[
            { label: 'Mood', data: controlMood.map((item) => Number(item.value)), borderColor: '#1d4ed8', tension: 0.25 },
            { label: 'Baseline', data: controlMood.map((item) => Number(item.baseline)), borderColor: '#334155', borderDash: [5, 5], tension: 0 },
            { label: 'UCL', data: controlMood.map((item) => Number(item.ucl)), borderColor: '#dc2626', borderDash: [4, 4], tension: 0 },
            { label: 'LCL', data: controlMood.map((item) => Number(item.lcl)), borderColor: '#0f766e', borderDash: [4, 4], tension: 0 }
          ]}
        />
        <MultiLineChart
          title="Control chart: Stress"
          labels={controlStress.map((item) => item.date)}
          datasets={[
            { label: 'Stress', data: controlStress.map((item) => Number(item.value)), borderColor: '#d2232a', tension: 0.25 },
            { label: 'Baseline', data: controlStress.map((item) => Number(item.baseline)), borderColor: '#334155', borderDash: [5, 5], tension: 0 },
            { label: 'UCL', data: controlStress.map((item) => Number(item.ucl)), borderColor: '#dc2626', borderDash: [4, 4], tension: 0 },
            { label: 'LCL', data: controlStress.map((item) => Number(item.lcl)), borderColor: '#0f766e', borderDash: [4, 4], tension: 0 }
          ]}
        />
      </section>

      <section className="chart-grid">
        <MultiLineChart
          title="Control chart: Energy"
          labels={controlEnergy.map((item) => item.date)}
          datasets={[
            { label: 'Energy', data: controlEnergy.map((item) => Number(item.value)), borderColor: '#f59e0b', tension: 0.25 },
            { label: 'Baseline', data: controlEnergy.map((item) => Number(item.baseline)), borderColor: '#334155', borderDash: [5, 5], tension: 0 },
            { label: 'UCL', data: controlEnergy.map((item) => Number(item.ucl)), borderColor: '#dc2626', borderDash: [4, 4], tension: 0 },
            { label: 'LCL', data: controlEnergy.map((item) => Number(item.lcl)), borderColor: '#0f766e', borderDash: [4, 4], tension: 0 }
          ]}
        />
      </section>

      <section className="panel-grid">
        <article className="data-panel">
          <h3>Cohort analysis</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>College</th><th>Year</th><th>Sex</th><th>Program</th><th>Students</th><th>Mean</th></tr></thead>
              <tbody>
                {(descriptive.cohortAnalysis || []).slice(0, 10).map((item) => (
                  <tr key={item.cohort}>
                    <td>{item.college}</td>
                    <td>{item.yearLevel}</td>
                    <td>{item.sex}</td>
                    <td>{item.academicProgram}</td>
                    <td>{item.totalStudents}</td>
                    <td>{item.meanScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="data-panel">
          <h3>Control-chart anomalies</h3>
          <div className="stack">
            {(descriptive.controlCharts?.anomalies || []).map((item) => (
              <div key={`${item.studentId}-${item.metric}-${item.date}`} className="mini-card">
                <div className="row-between">
                  <strong>{item.studentId}</strong>
                  <span className="muted">{item.date}</span>
                </div>
                <p>{item.metric.toUpperCase()} value {item.value} vs baseline {item.baseline}</p>
                <p className="muted">Z-score: {item.zScore}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );

  const renderPredictive = () => (
    <>
      <section className="metrics-grid">
        <StatCard label="Logistic accuracy" value={formatPercent(logisticMetrics.accuracy)} detail="Baseline interpretable model" tone="primary" />
        <StatCard label="XGBoost accuracy" value={formatPercent(xgboostMetrics.accuracy)} detail="Primary boosted model" tone="warning" />
        <StatCard label="XGBoost recall" value={formatPercent(xgboostMetrics.recall)} detail="High-risk detection sensitivity" tone="danger" />
      </section>

      <section className="chart-grid">
        <BarChart
          title="XGBoost feature importance"
          labels={(predictive.xgboost?.featureImportance || []).map((item) => item.feature)}
          values={(predictive.xgboost?.featureImportance || []).map((item) => Number(item.importance || 0))}
          horizontal
          seriesLabel="Importance"
          color="#1d4ed8"
        />
        <DoughnutChart
          title="Predicted risk probability bands"
          labels={['LOW', 'MODERATE', 'HIGH', 'CRISIS']}
          values={[predictionBands.low, predictionBands.moderate, predictionBands.high, predictionBands.crisis]}
        />
      </section>

      <section className="panel-grid">
        <article className="data-panel">
          <h3>Model predictions (latest per student)</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Current Risk</th><th>Logistic</th><th>XGBoost</th><th>Top SHAP Factor</th></tr></thead>
              <tbody>
                {(predictive.predictions || []).slice(0, 20).map((item) => (
                  <tr key={item.studentDbId}>
                    <td>{item.studentName || item.studentId}</td>
                    <td><RiskBadge level={item.riskLevel} /></td>
                    <td>{formatPercent(item.logisticProbability)}</td>
                    <td>{formatPercent(item.xgboostProbability)}</td>
                    <td>{item.shapTopFactors?.[0]?.feature || 'n/a'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="data-panel">
          <h3>SHAP explainability snapshot</h3>
          <div className="stack">
            {(predictive.shap?.globalImpact || []).slice(0, 8).map((item) => (
              <div key={item.feature} className="mini-card row-between">
                <span>{item.feature}</span>
                <strong>{item.impact}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );

  const renderPrescriptive = () => (
    <>
      <section className="metrics-grid">
        <StatCard label="Immediate referrals" value={decisionOutcomes.immediateReferral || 0} tone="danger" />
        <StatCard label="Urgent outreach" value={decisionOutcomes.urgentOutreach || 0} tone="warning" />
        <StatCard label="Structured follow-up" value={decisionOutcomes.structuredFollowUp || 0} tone="primary" />
      </section>

      <section className="chart-grid">
        <DoughnutChart title="Decision tree intervention outcomes" labels={outcomeLabels} values={outcomeValues} />
        <BarChart
          title="Rule-based intervention queue"
          labels={(prescriptive.ruleBasedInterventionEngine?.recommendations || []).slice(0, 10).map((item) => item.studentId)}
          values={(prescriptive.ruleBasedInterventionEngine?.recommendations || []).slice(0, 10).map((item) => Number(item.probability || 0))}
          seriesLabel="Predicted probability"
          color="#0f766e"
        />
      </section>

      <section className="panel-grid">
        <article className="data-panel">
          <h3>Decision tree pathways</h3>
          <div className="stack">
            {(prescriptive.decisionTree?.pathways || []).slice(0, 14).map((item) => (
              <div key={item.studentDbId} className="mini-card">
                <div className="row-between">
                  <strong>{item.studentName || item.studentId}</strong>
                  <span className={`urgency-badge urgency-${String(item.urgency || '').toLowerCase()}`}>{item.urgency}</span>
                </div>
                <p>{item.decisionPath}</p>
                <p className="muted">{item.recommendedAction}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="data-panel">
          <h3>Rule-based intervention engine</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Urgency</th><th>Anomalies</th><th>Action</th></tr></thead>
              <tbody>
                {(prescriptive.ruleBasedInterventionEngine?.recommendations || []).slice(0, 20).map((item) => (
                  <tr key={`${item.studentDbId}-${item.urgency}`}>
                    <td>{item.studentId}</td>
                    <td>{item.urgency}</td>
                    <td>{item.anomalyCount}</td>
                    <td>{item.recommendedAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </>
  );

  return (
    <div className="centered-container">
      <div className="facilitator-header">
        <div className="facilitator-header-top">
          <div className="facilitator-header-title">
            <h1>OGC Facilitator Dashboard</h1>
            <div className="facilitator-header-meta">
              <p><strong>Scope:</strong> {user?.assignedCollege || 'Assigned college'}</p>
              <p><strong>Synced:</strong> {data?.metadata?.syncedAt ? new Date(data.metadata.syncedAt).toLocaleString() : 'waiting for first sync'}</p>
            </div>
          </div>
          <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={() => loadDashboard().catch(() => null)}>{loading ? 'Syncing...' : 'Load Analytics'}</button>
        </div>
        <div className="tab-row">
          <Link to="/facilitator/dashboard" className="tab active">Analytics</Link>
          <Link to="/facilitator/appointments" className="tab">Slots</Link>
          <Link to="/facilitator/appointments" className="tab">Appointments</Link>
          <Link to="/facilitator/resources" className="tab">Emergency Contacts</Link>
        </div>
        <div className="analytics-nav-row">
          <button className={`tab ${activeMode === 'descriptive' ? 'active' : ''}`} onClick={() => setActiveMode('descriptive')}>Descriptive analytics</button>
          <button className={`tab ${activeMode === 'predictive' ? 'active' : ''}`} onClick={() => setActiveMode('predictive')}>Predictive analytics</button>
          <button className={`tab ${activeMode === 'prescriptive' ? 'active' : ''}`} onClick={() => setActiveMode('prescriptive')}>Prescriptive analytics</button>
        </div>
      </div>

      <section className="metrics-grid">
        <StatCard label="Monitored students" value={data?.totals?.totalStudents || 0} tone="primary" />
        <StatCard label="High risk" value={data?.totals?.highRiskCount || 0} detail="Students requiring rapid follow-up" tone="warning" />
        <StatCard label="Critical alerts" value={data?.totals?.criticalCount || 0} detail="Immediate outreach recommended" tone="danger" />
        <StatCard label="Open concerns" value={data?.criticalAlerts?.length || 0} detail="Latest high-priority assessments" />
      </section>

      {activeMode === 'descriptive' ? renderDescriptive() : null}
      {activeMode === 'predictive' ? renderPredictive() : null}
      {activeMode === 'prescriptive' ? renderPrescriptive() : null}

      <section className="panel-grid">
        <article className="data-panel">
          <h3>Critical alerts</h3>
          <div className="stack">
            {data?.criticalAlerts?.map((item) => (
              <div key={item.id} className="mini-card">
                <div className="row-between">
                  <strong>{item.studentId}</strong>
                  <RiskBadge level={item.riskLevel} />
                </div>
                <p>{item.assessmentType.toUpperCase()} - {item.totalScore}</p>
                <p className="muted">{item.recommendation}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="data-panel">
          <h3>Recent assessments</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Type</th><th>Risk</th><th>When</th></tr></thead>
              <tbody>
                {data?.recentAssessments?.map((item) => (
                  <tr key={item.id}>
                    <td>{item.consentFlag ? item.studentName : item.studentId}</td>
                    <td>{item.assessmentType.toUpperCase()}</td>
                    <td><RiskBadge level={item.riskLevel} /></td>
                    <td>{new Date(item.submittedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="panel-grid">
        <article className="data-panel">
          <h3>Appointment requests</h3>
          <div className="stack">
            {data?.appointmentRequests?.map((item) => (
              <div key={item.id} className="mini-card">
                <strong>{item.consentFlag ? item.studentName : item.studentId}</strong>
                <p>{item.purpose}</p>
                <p className="muted">{new Date(item.scheduledAt).toLocaleString()} - {item.status}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="data-panel">
          <h3>Risk summary</h3>
          <div className="stack">
            {data?.riskDistribution?.map((item) => (
              <div key={item.riskLevel} className="mini-card row-between">
                <span>{item.riskLevel.toUpperCase()}</span>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

        <section className="panel-grid">
          <article className="data-panel">
            <ConversationList
              onSelectConversation={handleSelectConversation}
              selectedStudentId={selectedConversation?.student_id}
            />
          </article>
        </section>

        {/* Chat Button */}
        <ChatButton onClick={() => setIsChatOpen(true)} />

        {/* Chat Panel */}
        {user && selectedConversation && (
          <ChatPanel
            studentId={selectedConversation.student_id}
            facilitatorId={user.id}
            currentUserId={user.id}
            currentUserRole={user.role}
            studentName={selectedConversationName}
            facilitatorName="You"
            isOpen={isChatOpen}
            onClose={() => {
              setIsChatOpen(false);
              setSelectedConversation(null);
            }}
          />
        )}
    </div>
  );
}