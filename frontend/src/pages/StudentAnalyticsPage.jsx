import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { LineTrendChart } from '../components/charts/LineTrendChart';
import { DoughnutChart } from '../components/charts/DoughnutChart';

export function StudentAnalyticsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/student/analytics').then(setData).catch(() => null);
  }, []);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <p className="eyebrow">Wellness analytics</p>
          <h1>Your mental wellness trajectory</h1>
        </div>
      </header>

      <section className="chart-grid">
        <LineTrendChart
          title="Risk history"
          labels={data?.riskHistory?.map((item) => item.date) || []}
          values={data?.riskHistory?.map((item) => Number(item.totalScore)) || []}
          label="Score"
        />
        <DoughnutChart
          title="Assessment history"
          labels={data?.assessmentBreakdown?.map((item) => item.assessmentType.toUpperCase()) || []}
          values={data?.assessmentBreakdown?.map((item) => Number(item.total)) || []}
        />
      </section>
    </div>
  );
}