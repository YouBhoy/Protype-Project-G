import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { RiskBadge } from '../components/RiskBadge';
import { LineTrendChart } from '../components/charts/LineTrendChart';
import { DoughnutChart } from '../components/charts/DoughnutChart';
import { ChatButton } from '../components/ChatButton';
import { ChatPanel } from '../components/ChatPanel';
import { ConversationList } from '../components/ConversationList';
import { useAuth } from '../contexts/AuthContext';
import { initializeSocket } from '../socket';

export function FacilitatorDashboardPage() {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);

  useEffect(() => {
    api.get('/facilitator/dashboard').then(setData).catch(() => null);

    // Initialize Socket.io connection
    if (token) {
      initializeSocket(token);
    }
  }, [token]);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setIsChatOpen(true);
  };

  const selectedConversationName = selectedConversation?.student_name
    || [selectedConversation?.first_name, selectedConversation?.last_name].filter(Boolean).join(' ')
    || 'Student';

  return (
    <div className="centered-container">
      <div className="facilitator-header">
        <div className="facilitator-header-top">
          <div className="facilitator-header-title">
            <h1>OGC Facilitator Dashboard</h1>
            <div className="facilitator-header-meta">
              <p><strong>Scope:</strong> College of Engineering</p>
            </div>
          </div>
          <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>Load Analytics</button>
        </div>
        <div className="tab-row">
          <button className="tab active">Analytics</button>
          <button className="tab">Slots</button>
          <button className="tab">Appointments</button>
          <button className="tab">Emergency Contacts</button>
        </div>
      </div>

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