import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { RiskBadge } from '../components/RiskBadge';
import { LineTrendChart } from '../components/charts/LineTrendChart';
import { DoughnutChart } from '../components/charts/DoughnutChart';

export function StudentDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/student/dashboard').then(setDashboard).catch((err) => setError(err.message));
    api.get('/student/analytics').then(setAnalytics).catch(() => null);
  }, []);

  const riskLabels = analytics?.riskHistory?.map((entry) => entry.date) || [];
  const riskValues = analytics?.riskHistory?.map((entry) => Number(entry.totalScore)) || [];
  const activityLabels = analytics?.assessmentBreakdown?.map((entry) => entry.assessmentType.toUpperCase()) || [];
  const activityValues = analytics?.assessmentBreakdown?.map((entry) => Number(entry.total)) || [];

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Student dashboard</p>
          <h1>Monitor your wellness and next steps</h1>
        </div>
        <Link className="btn btn-primary" to="/student/assessments">Take assessment</Link>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <section className="metrics-grid">
        <StatCard label="Latest risk level" value={<RiskBadge level={dashboard?.latestRiskLevel} />} detail="Server-scored from your most recent assessment" tone="primary" />
        <StatCard label="Next recommended action" value={dashboard?.nextRecommendedAction || 'Complete an assessment'} detail="Based on backend risk classification" />
        <StatCard label="Upcoming appointments" value={dashboard?.upcomingAppointments?.length || 0} detail="Counseling schedules and requests" />
        <StatCard label="Assessment entries" value={dashboard?.assessmentHistory?.length || 0} detail="Tracked from DASS-21, PHQ-9, GAD-7, and ESM" />
      </section>

      <section className="chart-grid">
        <LineTrendChart title="Risk trajectory" labels={riskLabels} values={riskValues} label="Total score" />
        <DoughnutChart title="Assessment mix" labels={activityLabels} values={activityValues} />
      </section>

      <section className="panel-grid">
        <article className="data-panel">
          <div className="section-heading"><h3>Recent assessments</h3></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Type</th><th>Score</th><th>Risk</th><th>Date</th></tr>
              </thead>
              <tbody>
                {dashboard?.assessmentHistory?.map((row, index) => (
                  <tr key={index}>
                    <td>{row.assessmentType.toUpperCase()}</td>
                    <td>{row.totalScore}</td>
                    <td><RiskBadge level={row.riskLevel} /></td>
                    <td>{new Date(row.submittedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="data-panel">
          <div className="section-heading"><h3>Upcoming appointments</h3></div>
          <div className="stack">
            {dashboard?.upcomingAppointments?.length ? dashboard.upcomingAppointments.map((item) => (
              <div key={item.id} className="mini-card">
                <strong>{item.purpose}</strong>
                <p>{new Date(item.scheduledAt).toLocaleString()}</p>
                <p className="muted">Status: {item.status}</p>
              </div>
            )) : <p className="muted">No upcoming appointments yet.</p>}
          </div>
        </article>
      </section>
    </div>
  );
}