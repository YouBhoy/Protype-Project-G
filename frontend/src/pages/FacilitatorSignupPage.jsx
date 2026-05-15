import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function FacilitatorSignupPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    assignedCollege: 'College of Engineering'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await auth.signupFacilitator(form);
      navigate('/facilitator/dashboard');
    } catch (err) {
      setError(err.message || 'OGC signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card wide">
        <p className="eyebrow">OGC onboarding</p>
        <h1>Create an OGC facilitator account</h1>
        <p className="body-copy">New OGC accounts are scoped to a specific college so facilitator dashboards stay permission-bound.</p>

        <form className="grid-form" onSubmit={handleSubmit}>
          {[
            ['Full name', 'name', 'text'],
            ['Email', 'email', 'email'],
            ['Password', 'password', 'password']
          ].map(([label, key, type]) => (
            <label className="input-block" key={key}>
              <span>{label}</span>
              <input
                type={type}
                value={form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              />
            </label>
          ))}

          <label className="input-block full-span">
            <span>Assigned college</span>
            <select value={form.assignedCollege} onChange={(event) => setForm({ ...form, assignedCollege: event.target.value })}>
              <option>College of Engineering</option>
              <option>College of Business</option>
              <option>College of Education</option>
              <option>College of Arts and Sciences</option>
            </select>
          </label>

          {error ? <p className="error-text full-span">{error}</p> : null}
          <button className="btn btn-primary full-span" type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create OGC account'}
          </button>
        </form>
      </section>
    </main>
  );
}