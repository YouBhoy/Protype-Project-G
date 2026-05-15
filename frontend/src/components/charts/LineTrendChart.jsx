import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export function LineTrendChart({ title, labels, values, label = 'Trend' }) {
  const data = {
    labels,
    datasets: [
      {
        label,
        data: values,
        borderColor: 'rgba(38, 99, 235, 1)',
        backgroundColor: 'rgba(38, 99, 235, 0.12)',
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
      <Line data={data} options={{ responsive: true, plugins: { legend: { display: false } } }} />
    </section>
  );
}