import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="public-page narrow-page">
      <section className="auth-card">
        <p className="eyebrow">404</p>
        <h1>Page not found</h1>
        <Link className="btn btn-primary" to="/">Return home</Link>
      </section>
    </main>
  );
}