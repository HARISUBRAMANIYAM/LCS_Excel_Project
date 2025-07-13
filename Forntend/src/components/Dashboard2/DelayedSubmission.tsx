import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Chart } from 'primereact/chart';
import { SelectButton } from 'primereact/selectbutton';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import api from '../../services/api';
import type { DelayedDataPoint, DelayedSubmissionModeResponse, DelayedSubmissionsProps, DelayEntry, SelectButtonChangeEvent, ViewOption } from './DashBoardInterface';

const DelayedSubmissions:React.FC<DelayedSubmissionsProps>= ({ year }) => {
  const [view, setView] = useState<'pf' | 'esi'>('pf');
  const [data, setData] = useState<DelayedSubmissionModeResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const viewOptions: ViewOption[] = [
    { label: 'PF', value: 'pf' },
    { label: 'ESI', value: 'esi' }
  ];

  useEffect(() => {
    fetchDelayedData();
  }, [year]);

  const fetchDelayedData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/dashboard/delayed-submissions_mode?year=${year}`);
      setData(response.data);
      setError(null);
    } catch (err:any) {
      setError(err.message || 'Failed to fetch delayed submissions data');
    } finally {
      setLoading(false);
    }
  };

  const formatDataForChart = (delayedData:DelayedSubmissionModeResponse, type:'pf' | 'esi'):DelayedDataPoint[] => {
    if (!delayedData || !delayedData.datasets) return [];
    
    const dataset = delayedData.datasets[type.toUpperCase() as 'PF' | 'ESI'];
    const formattedData :DelayedDataPoint [] =[];
    
    dataset.forEach((monthData:DelayEntry[], monthIndex:number) => {
      monthData.forEach((dataPoint:DelayEntry) => {
        formattedData.push({
          x: monthIndex + 1,
          y: dataPoint.delay_days,
          month: delayedData.labels[monthIndex],
          delayDays: dataPoint.delay_days
        });
      });
    });
    
    return formattedData;
  };

  const getChartData = (delayedData: DelayedSubmissionModeResponse, type: 'pf' | 'esi'): any => {
    const formattedData = formatDataForChart(delayedData, type);

    
    return {
      datasets: [
        {
          label: `${type.toUpperCase()} Delayed Submissions`,
          data: formattedData,
          backgroundColor: type === 'pf' ? 'rgba(54, 162, 235, 0.6)' : 'rgba(75, 192, 192, 0.6)',
          borderColor: type === 'pf' ? 'rgba(54, 162, 235, 1)' : 'rgba(75, 192, 192, 1)',
          pointRadius: 6,
          pointHoverRadius: 8
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `${view.toUpperCase()} Delayed Submissions - ${year}`
      },
      tooltip: {
        callbacks: {
          label: function(context:any) {
            const dataPoint = context.raw;
            return `${dataPoint.month}: ${dataPoint.delayDays} days delay`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        min: 0.5,
        max: 12.5,
        ticks: {
          stepSize: 1,
          callback: function(value:any) {
            return data?.labels[value - 1] || '';
          }
        },
        title: {
          display: true,
          text: 'Month'
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Delay Days'
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="delayed-submissions">
        <Skeleton height="3rem" className="mb-3"></Skeleton>
        <Skeleton height="400px"></Skeleton>
      </div>
    );
  }

  if (error) {
    return <Message severity="error" text={error} />;
  }

  if (!data) {
    return <Message severity="info" text="No delayed submissions data available" />;
  }

  const currentData = formatDataForChart(data, view);
  const chartData = getChartData(data, view);
const handleViewChange = (e: SelectButtonChangeEvent): void => {
    setView(e.value);
  };
  return (
    <div className="delayed-submissions">
      <div className="row mb-3">
        <div className="col-md-6">
          <h3 className="delayed-title">Delayed Submissions - {year}</h3>
        </div>
        <div className="col-md-6">
          <SelectButton
            value={view}
            onChange={() => handleViewChange}
            options={viewOptions}
            className="float-end"
          />
        </div>
      </div>

      <Card className="delayed-card">
        {currentData.length > 0 ? (
          <div className="chart-container" style={{ height: '400px' }}>
            <Chart 
              type="scatter" 
              data={chartData} 
              options={chartOptions}
              height="400px"
            />
          </div>
        ) : (
          <div className="no-data-message">
            <Message 
              severity="success" 
              text={`No delayed ${view.toUpperCase()} submissions for ${year}. All submissions were on time!`} 
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default DelayedSubmissions;