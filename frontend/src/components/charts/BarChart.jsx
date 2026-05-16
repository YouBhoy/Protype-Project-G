import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export function BarChart({ title, labels, values, horizontal = false, seriesLabel = 'Count', color = '#d2232a', loading = false, emptyMessage = 'No data available yet.', options = {}, colors }) {
  const hasData = Array.isArray(labels) && labels.length > 0 && Array.isArray(values) && values.some((value) => value != null);
  const backgroundColor = colors || color;

  return (
    <section className="chart-card">
      <div className="section-heading">
        <h3>{title}</h3>
      </div>
      {loading ? (
        <div className="chart-state chart-loading">Loading chart data...</div>
      ) : hasData ? (
        <div className="chart-canvas-wrap">
          <Bar
            data={{
              labels,
              datasets: [{
                label: seriesLabel,
                data: values,
                backgroundColor
              }]
            }}
            options={{
              indexAxis: horizontal ? 'y' : 'x',
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: horizontal ? {
                x: { beginAtZero: true }
              } : {
                y: { beginAtZero: true }
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
