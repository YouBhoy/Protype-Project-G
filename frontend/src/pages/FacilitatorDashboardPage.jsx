import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { RiskBadge } from '../components/RiskBadge';
import { LineTrendChart } from '../components/charts/LineTrendChart';
import { DoughnutChart } from '../components/charts/DoughnutChart';

export function FacilitatorDashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/facilitator/dashboard').then(setData).catch(() => null);
  }, []);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">OGC facilitator dashboard</p>
          <h1>Identify students who need attention now</h1>
        </div>
        <Link className="btn btn-primary" to="/facilitator/appointments">Manage availability</Link>
      </header>

      <section className="metrics-grid">
        <StatCard label="Monitored students" value={data?.totals?.totalStudents || 0} tone="primary" />
        <StatCard label="High risk" value={data?.totals?.highRiskCount || 0} detail="Students requiring rapid follow-up" tone="warning" />
        <StatCard label="Critical alerts" value={data?.totals?.criticalCount || 0} detail="Immediate outreach recommended" tone="danger" />
        <StatCard label="Open concerns" value={data?.criticalAlerts?.length || 0} detail="Latest high-priority assessments" />
      </section>

      <section className="chart-grid">
        <LineTrendChart
          title="Wellness trajectory"
          labels={data?.wellnessTrajectory?.map((item) => item.date) || []}
          values={data?.wellnessTrajectory?.map((item) => Number(item.averageScore)) || []}
          label="Average score"
        />
        <DoughnutChart
          title="Risk distribution"
          labels={data?.riskDistribution?.map((item) => item.riskLevel.toUpperCase()) || []}
          values={data?.riskDistribution?.map((item) => Number(item.total)) || []}
        />
      </section>

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
    </div>
  );
}