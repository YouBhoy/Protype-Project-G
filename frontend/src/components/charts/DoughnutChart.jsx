import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export function DoughnutChart({ title, labels, values, loading = false, emptyMessage = 'No data available yet.', colors = ['#1d4ed8', '#0f766e', '#f59e0b', '#dc2626'], options = {} }) {
  const total = Array.isArray(values) ? values.reduce((sum, value) => sum + Number(value || 0), 0) : 0;
  const hasData = Array.isArray(labels) && labels.length > 0 && Array.isArray(values) && total > 0;

  return (
    <section className="chart-card">
      <div className="section-heading">
        <h3>{title}</h3>
      </div>
      {loading ? (
        <div className="chart-state chart-loading">Loading chart data...</div>
      ) : hasData ? (
        <div className="chart-canvas-wrap">
          <Doughnut
            data={{
              labels,
              datasets: [{ data: values, backgroundColor: colors }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } },
              ...options
            }}
          />
        </div>
      ) : (
        <div className="chart-state chart-empty">{emptyMessage}</div>
      )}
    </section>
  );
}