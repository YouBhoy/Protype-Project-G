import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export function LineTrendChart({ title, labels, values, label = 'Trend', loading = false, emptyMessage = 'No data available yet.', color = 'rgba(38, 99, 235, 1)', fillColor = 'rgba(38, 99, 235, 0.12)', options = {} }) {
  const hasData = Array.isArray(labels) && labels.length > 0 && Array.isArray(values) && values.some((value) => value != null);

  const data = {
    labels,
    datasets: [
      {
        label,
        data: values,
        borderColor: color,
        backgroundColor: fillColor,
        tension: 0.35,
        fill: true
      }
    ]
  };

  return (
    <section className="chart-card">
      <div className="section-heading">
        <h3>{title}</h3>
      </div>
      {loading ? (
        <div className="chart-state chart-loading">Loading chart data...</div>
      ) : hasData ? (
        <div className="chart-canvas-wrap">
          <Line
            data={data}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
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