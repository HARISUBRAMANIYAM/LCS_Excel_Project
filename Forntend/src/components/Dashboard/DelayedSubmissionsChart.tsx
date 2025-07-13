
import React, { useEffect, useState } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../services/api";


interface DelayDataPoint {
  delay_days: number;
}

interface DelayedData {
  labels: string[];
  datasets: {
    PF: DelayDataPoint[][];
    ESI: DelayDataPoint[][];
  };
}

interface FormattedDataPoint {
  month: number;
  monthName: string;
  delay_days: number;
}

interface DelayedSubmissionsChartProps {
  currentYear: number;
}

const DelayedSubmissionsChart: React.FC<DelayedSubmissionsChartProps> = ({
  currentYear,
}) => {
  const [data, setData] = useState<DelayedData | null>(null);
  const [formattedPFData, setFormattedPFData] = useState<FormattedDataPoint[]>([]);
  const [formattedESIData, setFormattedESIData] = useState<FormattedDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDelayedData = async () => {
      try {
        setLoading(true);
        // Fetch delayed submission data from the new endpoint
        const response = await api.get(
          `/dashboard/delayed-submissions_mode?year=${currentYear}`
        );
        setData(response.data);
        
        // Process data for visualization
        if (response.data && response.data.datasets) {
          // Format PF data
          const pfData: FormattedDataPoint[] = [];
          response.data.datasets.PF.forEach((monthData:DelayDataPoint[], monthIndex:number) => {
            monthData.forEach(dataPoint => {
              pfData.push({
                month: monthIndex + 1, // 1-based month number
                monthName: response.data.labels[monthIndex],
                delay_days: dataPoint.delay_days
              });
            });
          });
          setFormattedPFData(pfData);
          
          // Format ESI data
          const esiData: FormattedDataPoint[] = [];
          response.data.datasets.ESI.forEach((monthData:DelayDataPoint[], monthIndex:number) => {
            monthData.forEach(dataPoint => {
              esiData.push({
                month: monthIndex + 1, // 1-based month number
                monthName: response.data.labels[monthIndex],
                delay_days: dataPoint.delay_days
              });
            });
          });
          setFormattedESIData(esiData);
        }
        
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to fetch delayed submissions data");
      } finally {
        setLoading(false);
      }
    };

    fetchDelayedData();
  }, [currentYear]);

  if (loading) {
    return <div className="loading">Loading delayed submission data...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!data) {
    return (
      <div className="no-data">No delayed submissions data available.</div>
    );
  }

  return (
    <div className="delayed-submissions-chart">
      <h2>Delayed PF Submissions ({currentYear})</h2>
      {formattedPFData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 50, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number" 
              dataKey="month" 
              name="Month" 
              domain={[0.5, 12.5]}
              ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
              tickFormatter={(month) => data.labels[month-1]}
              label={{
                value: "Month",
                position: "insideBottom",
                offset: -10,
                fill: "#6b7280",
              }}
              tick={{ fill: "#6b7280" }}
            />
            <YAxis
              type="number"
              dataKey="delay_days"
              name="Delay Days"
              label={{
                value: "Delay Days",
                angle: -90,
                position: "insideLeft",
                offset: -10,
                fill: "#6b7280",
              }}
              tick={{ fill: "#6b7280" }}
            />
            <Tooltip
              formatter={(value, name, props) => {
                if (name === "month") {
                  return [props.payload.monthName, "Month"];
                }
                return [value, name === "delay_days" ? "Delay Days" : name];
              }}
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                border: "1px solid #e5e7eb",
                borderRadius: "0.375rem",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Scatter 
              name="PF Delayed" 
              data={formattedPFData} 
              fill="#0088FE"
            />
          </ScatterChart>
        </ResponsiveContainer>
      ) : (
        <div className="no-data">
          <p>No delayed PF submissions for {currentYear}</p>
          <p>All PF submissions were on time!</p>
        </div>
      )}

      <h2>Delayed ESI Submissions ({currentYear})</h2>
      {formattedESIData.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 50, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number" 
              dataKey="month" 
              name="Month" 
              domain={[0.5, 12.5]}
              ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
              tickFormatter={(month) => data.labels[month-1]}
              label={{
                value: "Month",
                position: "insideBottom",
                offset: -10,
                fill: "#6b7280",
              }}
              tick={{ fill: "#6b7280" }}
            />
            <YAxis
              type="number"
              dataKey="delay_days"
              name="Delay Days"
              label={{
                value: "Delay Days",
                angle: -90,
                position: "insideLeft",
                offset: -10,
                fill: "#6b7280",
              }}
              tick={{ fill: "#6b7280" }}
            />
            <Tooltip
              formatter={(value, name, props) => {
                if (name === "month") {
                  return [props.payload.monthName, "Month"];
                }
                return [value, name === "delay_days" ? "Delay Days" : name];
              }}
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                border: "1px solid #e5e7eb",
                borderRadius: "0.375rem",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Scatter 
              name="ESI Delayed" 
              data={formattedESIData} 
              fill="#82ca9d"
            />
          </ScatterChart>
        </ResponsiveContainer>
      ) : (
        <div className="no-data">
          <p>No delayed ESI submissions for {currentYear}</p>
          <p>All ESI submissions were on time!</p>
        </div>
      )}
    </div>
  );
};

export default DelayedSubmissionsChart;