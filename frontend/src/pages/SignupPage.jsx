import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function SignupPage() {
  const [form, setForm] = useState({
    studentId: '',
    name: '',
    email: '',
    password: '',
    college: 'College of Engineering',
    yearLevel: '1st Year',
    sex: 'Prefer not to say'
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
      await auth.signupStudent(form);
      navigate('/student/consent');
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card wide">
        <p className="eyebrow">Student onboarding</p>
        <h1>Create a student account</h1>
        <form className="grid-form" onSubmit={handleSubmit}>
          {[
            ['Student ID', 'studentId'],
            ['Full name', 'name'],
            ['Email', 'email'],
            ['Password', 'password']
          ].map(([label, key]) => (
            <label className="input-block" key={key}>
              <span>{label}</span>
              <input
                type={key === 'password' ? 'password' : 'text'}
                value={form[key]}
                onChange={(event) => setForm({ ...form, [key]: event.target.value })}
              />
            </label>
          ))}

          <label className="input-block">
            <span>College</span>
            <select value={form.college} onChange={(event) => setForm({ ...form, college: event.target.value })}>
              <option>College of Engineering</option>
              <option>College of Business</option>
              <option>College of Education</option>
              <option>College of Arts and Sciences</option>
            </select>
          </label>

          <label className="input-block">
            <span>Year level</span>
            <select value={form.yearLevel} onChange={(event) => setForm({ ...form, yearLevel: event.target.value })}>
              <option>1st Year</option>
              <option>2nd Year</option>
              <option>3rd Year</option>
              <option>4th Year</option>
              <option>5th Year</option>
            </select>
          </label>

          <label className="input-block">
            <span>Sex</span>
            <select value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value })}>
              <option>Prefer not to say</option>
              <option>Male</option>
              <option>Female</option>
              <option>Non-binary</option>
            </select>
          </label>

          {error ? <p className="error-text full-span">{error}</p> : null}
          <button className="btn btn-primary full-span" type="submit" disabled={loading}>{loading ? 'Creating account...' : 'Create account'}</button>
        </form>
      </section>
    </main>
  );
}