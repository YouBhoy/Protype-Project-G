import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export function BarChart({ title, labels, values, horizontal = false, seriesLabel = 'Count', color = '#d2232a' }) {
  return (
    <section className="chart-card">
      <div className="section-heading">
        <h3>{title}</h3>
      </div>
      <Bar
        data={{
          labels,
          datasets: [{
            label: seriesLabel,
            data: values,
            backgroundColor: color
          }]
        }}
        options={{
          indexAxis: horizontal ? 'y' : 'x',
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true }
          }
        }}
      />
    </section>
  );
}
