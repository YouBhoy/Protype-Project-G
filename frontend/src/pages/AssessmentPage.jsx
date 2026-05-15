import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { AssessmentForm } from '../components/AssessmentForm';
import { RiskBadge } from '../components/RiskBadge';

export function AssessmentPage() {
  const { type } = useParams();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/public/assessments').then((data) => setCatalog(data.items)).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    setResult(null);
    setError('');
    setSubmitting(false);
  }, [type]);

  const definition = useMemo(() => catalog.find((item) => item.key === type) || null, [catalog, type]);
  const showChooser = !type;
  const assessmentChoices = useMemo(() => catalog.map((item) => ({
    ...item,
    displayLabel: item.key === 'esm' ? 'EMS Checkup' : item.label,
    actionLabel: item.key === 'esm' ? 'Start EMS checkup' : `Start ${item.label}`
  })), [catalog]);

  async function handleSubmit(responses) {
    setSubmitting(true);
    setError('');
    try {
      const data = await api.post(`/student/assessments/${type}/submit`, { responses });
      setResult(data.result);
    } catch (err) {
      setError(err.message || 'Unable to submit assessment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Assessment workflow</p>
          <h1>{definition?.label || 'Choose an assessment'}</h1>
          <p className="body-copy">{definition?.description || 'Select DASS-21, PHQ-9, GAD-7, or the EMS checkup to continue.'}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/student/dashboard')}>Back to dashboard</button>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}
      {showChooser ? (
        <section className="page-stack">
          <div className="section-heading">
            <h2>Choose an assessment</h2>
          </div>
          <div className="assessment-picker-grid">
            {assessmentChoices.map((item) => (
              <article key={item.key} className="info-card assessment-picker-card">
                <div>
                  <p className="eyebrow">{item.key.toUpperCase()}</p>
                  <h3>{item.displayLabel}</h3>
                  <p className="body-copy">{item.description}</p>
                </div>
                <Link className="btn btn-primary" to={`/student/assessments/${item.key}`}>
                  {item.actionLabel}
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : result ? (
        <section className="result-card">
          <h2>Assessment scored by backend</h2>
          <div className="result-grid">
            <div><span className="muted">Risk level</span><RiskBadge level={result.riskLevel} /></div>
            <div><span className="muted">Total score</span><strong>{result.totalScore}</strong></div>
            <div><span className="muted">Recommendation</span><p>{result.recommendation}</p></div>
          </div>
        </section>
      ) : null}

      {!showChooser ? <AssessmentForm definition={definition} onSubmit={handleSubmit} submitting={submitting} /> : null}
    </div>
  );
}