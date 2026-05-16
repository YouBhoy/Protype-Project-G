import React from 'react';
import './InfoCards.css';

export function InfoCards({ items = [] }) {
  return (
    <div className="info-cards">
      {items.map((it) => (
        <div key={it.key} className="info-card">
          <div className="info-icon" aria-hidden>
            {it.icon || 'ℹ️'}
          </div>
          <div className="info-body">
            <div className="info-label">{it.label}</div>
            <div className="info-value">{typeof it.value === 'number' ? it.value : it.value || 0}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default InfoCards;
