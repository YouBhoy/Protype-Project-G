import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export function DoughnutChart({ title, labels, values }) {
  return (
    <section className="chart-card">
      <div className="section-heading">
        <h3>{title}</h3>
      </div>
      <Doughnut
        data={{
          labels,
          datasets: [{ data: values, backgroundColor: ['#1d4ed8', '#0f766e', '#f59e0b', '#dc2626'] }]
        }}
        options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
      />
    </section>
  );
}