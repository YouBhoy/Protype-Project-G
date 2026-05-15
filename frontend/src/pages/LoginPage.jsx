import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const [tab, setTab] = useState('login');
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
        {/* Red Header Section */}
        <div className="auth-card-header">
          <div className="auth-card-seal">🛡️</div>
          <h2 className="auth-card-title">SPARTAN-G Portal</h2>
          <p className="auth-card-subtitle">Student assessment and OGC facilitator prototype portal.</p>
        </div>

        {/* Tab Navigation */}
        <div className="auth-card-tabs">
          <button
            className={tab === 'login' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => setTab('login')}
            type="button"
          >
            Login
          </button>
          <button
            className={tab === 'signup' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => setTab('signup')}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {/* Login Form */}
        {tab === 'login' ? (
          <form className="stack" onSubmit={handleSubmit}>
            {/* Login As Dropdown */}
            <label className="input-block">
              <span>Login As</span>
              <select value={mode} onChange={(e) => setMode(e.target.value)} className="login-dropdown">
                <option value="student">Student</option>
                <option value="ogc">OGC Facilitator</option>
              </select>
            </label>
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
          <p className="login-mode-text">Current login mode: {mode === 'student' ? 'Student' : 'OGC'}</p>
        </form>
      ) : (
        <div className="auth-signup-redirect">
          <p>Choose your registration path:</p>
          <div className="signup-button-row">
            <Link className="btn btn-primary" to="/signup">Student Registration</Link>
            <Link className="btn btn-primary" to="/facilitator/signup">OGC Registration</Link>
          </div>
        </div>
      )}
      </section>
    </main>
  );
}