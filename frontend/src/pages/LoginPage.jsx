import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const [mode, setMode] = useState('student');
  const [form, setForm] = useState({ studentId: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    // Basic client-side validation
    if (mode === 'student' && !form.studentId.trim()) {
      setError('Student ID is required');
      setLoading(false);
      return;
    }
    if (mode === 'ogc' && !form.email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }
    if (!form.password) {
      setError('Password is required');
      setLoading(false);
      return;
    }
    try {
      const user = mode === 'student'
        ? await auth.loginStudent({ studentId: form.studentId, password: form.password })
        : await auth.loginFacilitator({ email: form.email, password: form.password });

      navigate(user.role === 'ogc' ? '/facilitator/dashboard' : (user.consentFlag ? '/student/dashboard' : '/student/consent'));
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Secure access</p>
        <h1>Login to SPARTAN-G</h1>
        <div className="toggle-row">
          <button className={mode === 'student' ? 'toggle active' : 'toggle'} onClick={() => setMode('student')} type="button">Student</button>
          <button className={mode === 'ogc' ? 'toggle active' : 'toggle'} onClick={() => setMode('ogc')} type="button">OGC</button>
        </div>

        <form className="stack" onSubmit={handleSubmit}>
          {mode === 'student' ? (
            <label className="input-block">
              <span>Student ID</span>
              <input value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })} />
            </label>
          ) : (
            <label className="input-block">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
          )}

          <label className="input-block">
            <span>Password</span>
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>

          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>

        <div className="stack" style={{ marginTop: '18px' }}>
          <p className="muted">Need an account?</p>
          <div className="button-row">
            <Link className="btn btn-secondary" to="/signup">Student registration</Link>
            <Link className="btn btn-secondary" to="/facilitator/signup">OGC registration</Link>
          </div>
        </div>
      </section>
    </main>
  );
}