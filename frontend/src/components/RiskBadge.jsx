import React from 'react';

export function RiskBadge({ level }) {
  const normalized = String(level || 'low');
  return <span className={`risk-badge risk-${normalized}`}>{normalized.toUpperCase()}</span>;
}