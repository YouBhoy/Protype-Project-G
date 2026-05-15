import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export function ConsentPage() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { user, refreshProfile, setUser } = useAuth();
  const navigate = useNavigate();

  async function handleAccept() {
    setSaving(true);
    setError('');

    try {
      const data = await api.post('/student/profile/consent', {});
      setUser(data.user);
      await refreshProfile();
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.message || 'Unable to record consent');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card wide">
        <p className="eyebrow">Privacy acknowledgment</p>
        <h1>Before you continue</h1>
        <p className="body-copy">
          SPARTAN-G stores assessment and wellness data for counseling support, monitoring, and intervention.
          Your information is protected by role-based access and privacy controls.
        </p>
        <div className="notice-box">
          <p>Your account: <strong>{user?.studentId}</strong></p>
          <p>College: <strong>{user?.college}</strong></p>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="button-row">
          <button className="btn btn-primary" onClick={handleAccept} disabled={saving}>{saving ? 'Saving...' : 'I understand and consent'}</button>
          <button className="btn btn-secondary" onClick={() => navigate('/resources')} type="button">View emergency resources</button>
        </div>
      </section>
    </main>
  );
}