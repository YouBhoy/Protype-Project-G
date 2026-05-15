import React from 'react';

export function StatCard({ label, value, detail, tone = 'neutral' }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <p className="muted">{label}</p>
      <h3>{value}</h3>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}