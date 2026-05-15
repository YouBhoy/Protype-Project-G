import React from 'react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <main className="hero-page">
      <section className="hero-panel">
        <p className="eyebrow">University mental wellness monitoring</p>
        <h1>SPARTAN-G helps students and OGC facilitators act early.</h1>
        <p className="hero-copy">
          A web-first assessment and intervention prototype for risk monitoring, counseling workflows,
          appointment management, and wellness analytics.
        </p>
        <div className="button-row">
          <Link className="btn btn-primary" to="/login">Open Portal</Link>
          <Link className="btn btn-secondary" to="/resources">Emergency Resources</Link>
        </div>
      </section>

      <section className="feature-grid">
        <article className="info-card"><h3>Consent-first access</h3><p>Students must acknowledge privacy before assessments open.</p></article>
        <article className="info-card"><h3>Backend scoring</h3><p>Risk classification is computed server-side from validated responses.</p></article>
        <article className="info-card"><h3>Facilitator scope control</h3><p>OGC views are filtered by assigned college and privacy rules.</p></article>
      </section>
    </main>
  );
}