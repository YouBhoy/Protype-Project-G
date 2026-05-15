import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export function EmergencyResourcesPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get('/public/emergency-resources').then((data) => setItems(data.items || [])).catch(() => null);
  }, []);

  return (
    <main className="public-page narrow-page">
      <section className="info-hero compact">
        <p className="eyebrow">Emergency resources</p>
        <h1>Immediate support contacts</h1>
        <p>Use these contacts when a student needs urgent help or referral support.</p>
      </section>

      <section className="feature-grid resources-grid">
        {items.map((item) => (
          <article key={item.id} className="info-card">
            <p className="muted">{item.organization}</p>
            <h3>{item.title}</h3>
            <strong>{item.phone}</strong>
            <p>{item.description}</p>
            {item.isCritical ? <span className="risk-badge risk-critical">CRITICAL</span> : null}
          </article>
        ))}
      </section>
    </main>
  );
}