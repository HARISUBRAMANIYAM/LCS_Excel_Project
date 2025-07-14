import React, { useState, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Chart } from 'primereact/chart';
import { SelectButton } from 'primereact/selectbutton';
import { Message } from 'primereact/message';
import { Skeleton } from 'primereact/skeleton';
import api from '../../services/api';
import { type SelectButtonChangeEvent, type SubmissionTimelineProps, type UploadDay } from '../../interface/DashboardModule';
import { type TimelineDataPoint } from '../../interface/DashboardModule';
import { monthLabels, monthToNumber, viewOptions } from '../../interface/DashboardModule';

const SubmissionTimeline: React.FC<SubmissionTimelineProps> = ({ year }) => {
  const [view, setView] = useState<'pf' | 'esi'>('pf');
  const [pfData, setPfData] = useState<TimelineDataPoint[]>([]);
  const [esiData, setEsiData] = useState<TimelineDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);




  useEffect(() => {
    fetchTimelineData();
  }, [year]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/dashboard/uploads/by-year-days?year=${year}`);

      const mapData = (data: UploadDay[]): TimelineDataPoint[] =>
        data.map(item => ({
          x: monthToNumber[item.month],
          y: parseInt(item.day.toString()),
          month: item.month,
          day: item.day,
        })).sort((a, b) => a.x - b.x || a.y - b.y);

      setPfData(mapData(response.data.pf || []));
      setEsiData(mapData(response.data.esi || []));
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch timeline data');
    } finally {
      setLoading(false);
    }
  };

  const getChartData = (data: TimelineDataPoint[], label: string, color: string): any => {
    return {
      labels: monthLabels,
      datasets: [
        {
          label: label,
          data: data.map(item => ({ x: item.x, y: item.y })),
          borderColor: color,
          backgroundColor: color,
          fill: false,
          tension: 0.1
        },
        {
          label: 'Deadline',
          data: Array(12).fill(15),
          borderColor: 'red',
          backgroundColor: 'red',
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0
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
        text: `${view ? "PF" :"ESI"}Submission Timeline - ${year}`
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            if (context.datasetIndex === 0) {
              const dataPoint = context.raw;
              return `${dataPoint.y} ${monthLabels[dataPoint.x - 1]}`;
            }
            return 'Deadline: 15th';
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        min: 1,
        max: 12,
        ticks: {
          stepSize: 1,
          callback: function (value: any) {
            return monthLabels[value - 1];
          }
        },
        title: {
          display: true,
          text: 'Month'
        }
      },
      y: {
        min: 1,
        max: 31,
        reverse: true,
        ticks: {
          stepSize: 5
        },
        title: {
          display: true,
          text: 'Day of Month'
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="submission-timeline">
        <Skeleton height="3rem" className="mb-3"></Skeleton>
        <Skeleton height="400px"></Skeleton>
      </div>
    );
  }

  if (error) {
    return <Message severity="error" text={error} />;
  }

  const currentData = view === 'pf' ? pfData : esiData;
  const chartData = getChartData(
    currentData,
    `${view.toUpperCase()} Submission`,
    view === 'pf' ? '#8884d8' : '#82ca9d'
  );
  const handleViewChange = (e: SelectButtonChangeEvent): void => {
    console.log(e.value)
    setView(e.value);
  };
  return (
    <div className="submission-timeline">
      <div className="row mb-3">
        <div className="col-md-6">
          <h3 className="timeline-title">Submission Timeline - {year}</h3>
        </div>
        <div className="col-md-6">
          <SelectButton
            value={view}
            onChange={(e) => setView(e.value)}
            options={viewOptions}
            className="float-end"
          />
        </div>
      </div>

      <Card className="timeline-card">
        {currentData.length > 0 ? (
          <div className="chart-container" style={{ height: '400px' }}>
            <Chart
              type="line"
              data={chartData}
              options={chartOptions}
              height="400px"
            />
          </div>
        ) : (
          <div className="no-data-message">
            <Message
              severity="info"
              text={`No ${view.toUpperCase()} submission data available for ${year}`}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default SubmissionTimeline;