import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export function MultiLineChart({ title, labels, datasets, loading = false, emptyMessage = 'No data available yet.', options = {} }) {
  const hasData = Array.isArray(labels) && labels.length > 0 && Array.isArray(datasets) && datasets.some((dataset) => Array.isArray(dataset.data) && dataset.data.some((value) => value != null));

  return (
    <section className="chart-card">
      {title ? (
        <div className="section-heading">
          <h3>{title}</h3>
        </div>
      ) : null}
      {loading ? (
        <div className="chart-state chart-loading">Loading chart data...</div>
      ) : hasData ? (
        <div className="chart-canvas-wrap">
          <Line
            data={{ labels, datasets }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } },
              interaction: {
                mode: 'index',
                intersect: false
              },
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
