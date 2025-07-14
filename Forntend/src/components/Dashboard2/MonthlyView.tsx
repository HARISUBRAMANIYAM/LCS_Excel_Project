import React from 'react';
import { Card } from 'primereact/card';
import { Chart } from 'primereact/chart';
import type { MonthlyOverviewProps } from '../../interface/DashboardModule';

const MonthlyOverview :React.FC<MonthlyOverviewProps> =({ data, summaryStats, formatCurrency }) => {
  if (!data || !summaryStats) {
    return <div>No data available</div>;
  }

  const chartData:any = {
    labels: data.labels,
    datasets: [
      {
        label: 'PF',
        data: data.datasets.PF,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      },
      {
        label: 'ESI',
        data: data.datasets.ESI,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }
    ]
  };

  const chartOptions :any= {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Monthly Remittance Amounts - ${summaryStats.year}`
      },
      tooltip: {
        callbacks: {
          label: function(context:any) {
            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value:any) {
            return formatCurrency(value);
          }
        }
      }
    }
  };

  return (
    <div className="monthly-overview">
      <Card className="chart-card">
        <div className="chart-container" style={{ height: '400px' }}>
          <Chart 
            type="bar" 
            data={chartData} 
            options={chartOptions}
            height="400px"
          />
        </div>
      </Card>
    </div>
  );
};

export default MonthlyOverview;