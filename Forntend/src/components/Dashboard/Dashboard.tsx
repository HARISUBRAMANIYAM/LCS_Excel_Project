import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import api from "../../services/api";
import DelayedSubmissionsChart from "./DelayedSubmissionsChart";
import SubmissionTimeline from "./SubmissionTimeline";
// Interfaces
interface SubmissionPoint {
  x: number;
  y: number;
  r?: number;
}

interface DelayedSubmission {
  delay_days: number;
  amount: number;
}

interface MonthlyAmountData {
  labels: string[];
  datasets: {
    PF: number[];
    ESI: number[];
  };
}

interface SubmissionData {
  labels: string[];
  points: SubmissionPoint[][];
}

interface DelayedData {
  labels: string[];
  datasets: {
    PF: DelayedSubmission[][];
    ESI: DelayedSubmission[][];
  };
}

interface SummaryStats {
  total_pf: number | string;
  total_esi: number | string;
  pf_submissions: number;
  esi_submissions: number;
  on_time_rate: number;
  avg_pf: number | string;
  avg_esi: number | string;
}

interface SummaryStatsResponse {
  summary_stats: SummaryStats;
  monthly_amounts: MonthlyAmountData;
  year: number;
}

interface SubmissionsDataResponse {
  pf_submissions: SubmissionData;
  esi_submissions: SubmissionData;
  delayed_submissions: DelayedData;
  year: number;
}

interface yearlistResponse {
  yearlist: number[];
}

export default function RemittanceDashboard() {
  // State management
  const [monthlyAmountData, setMonthlyAmountData] =
    useState<MonthlyAmountData | null>(null);
  const [submissionsData, setSubmissionsData] =
    useState<SubmissionsDataResponse | null>(null);
  const [summaryStats, setSummaryStats] = useState<SummaryStatsResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearlist, setYearlist] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(-1);
  const [activeTab, setActiveTab] = useState<
    "overview" | "submissions" | "delayed"
  >("overview");

  // Fetch data from separate endpoints
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch data from all three endpoints in parallel
        const [
          yearlistResponse,
          yearlySummaryResponse,
          monthlyAmountsResponse,
          submissionsDataResponse,
        ] = await Promise.all([
          api.get<yearlistResponse>(`/dashboard/year_list`),
          api.get(`/dashboard/yearly_summary?year=${selectedYear}`),
          api.get(`/dashboard/monthly_amounts?year=${selectedYear}`),
          api.get(`/dashboard/submissions_data?year=${selectedYear}`),
        ]);

        // Process and set the data
        setYearlist(yearlistResponse.data.yearlist);
        setSummaryStats(yearlySummaryResponse.data);
        setMonthlyAmountData(monthlyAmountsResponse.data);

        setSubmissionsData(submissionsDataResponse.data);

        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear, selectedMonth]);

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading dashboard data...</div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="error-container">
        <p className="error-title">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  // No data state
  if (!monthlyAmountData || !summaryStats || !submissionsData) {
    return (
      <div className="no-data">
        <p className="no-data-message">No remittance data available.</p>
      </div>
    );
  }

  // Prepare data for charts (uses all months)
  const monthlyData = monthlyAmountData.labels.map((month, i) => ({
    month,
    PF: monthlyAmountData.datasets.PF[i],
    ESI: monthlyAmountData.datasets.ESI[i],
  }));

  // Get current month data for summary cards only
  const currentMonthData =
    selectedMonth !== -1
      ? {
          pfAmount: summaryStats.monthly_amounts.datasets.PF[selectedMonth],
          esiAmount: summaryStats.monthly_amounts.datasets.ESI[selectedMonth],
          monthName: summaryStats.monthly_amounts.labels[selectedMonth],
        }
      : null;

  // Helper function for currency formatting
  const formatCurrency = (value: number | null | string) => {
    if (value === null || value === undefined) return "₹0";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return numValue.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="flex">
          <h1 className="dashboard-title">
            Remittance Dashboard {summaryStats.year}
          </h1>

          <div className="filters-container">
            <div className="filter-group">
              <label className="filter-label">Year:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="filter-select"
                aria-label="year">
                {yearlist.length === 0 ? (
                  <option disabled>Loading years...</option>
                ) : (
                  yearlist.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="filter-group">
              <label className="filter-label"> Month:</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="filter-select"
                aria-label="month">
                <option value={-1}>All Months</option>
                {monthlyAmountData.labels.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="summary-cards">
          {/* PF Summary Card - affected by month filter */}
          <div className="summary-card pf">
            <h3 className="summary-title pf">
              {selectedMonth === -1
                ? "PF Remittance (Year)"
                : `PF Remittance (${currentMonthData?.monthName})`}
            </h3>
            <div className="summary-item">
              <span className="summary-label">Total:</span>
              <span className="summary-value pf">
                {selectedMonth === -1
                  ? formatCurrency(summaryStats.summary_stats.total_pf)
                  : formatCurrency(currentMonthData?.pfAmount ?? 0)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Avg:</span>
              <span className="summary-value pf">
                {formatCurrency(summaryStats.summary_stats.avg_pf)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Submissions:</span>
              <span className="summary-value pf">
                {summaryStats.summary_stats.pf_submissions}
              </span>
            </div>
          </div>

          {/* ESI Summary Card - affected by month filter */}
          <div className="summary-card esi">
            <h3 className="summary-title esi">
              {selectedMonth === -1
                ? "ESI Remittance (Year)"
                : `ESI Remittance (${currentMonthData?.monthName})`}
            </h3>
            <div className="summary-item">
              <span className="summary-label">Total:</span>
              <span className="summary-value esi">
                {selectedMonth === -1
                  ? formatCurrency(summaryStats.summary_stats.total_esi)
                  : formatCurrency(currentMonthData?.esiAmount ?? 0)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Avg:</span>
              <span className="summary-value esi">
                {formatCurrency(summaryStats.summary_stats.avg_esi)}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Submissions:</span>
              <span className="summary-value esi">
                {summaryStats.summary_stats.esi_submissions}
              </span>
            </div>
          </div>

          {/* Performance Card */}
          <div className="summary-card performance">
            <h3 className="summary-title performance">Performance</h3>
            <div className="summary-item">
              <span className="summary-label">On-Time Rate:</span>
              <div>
                <div className="summary-value performance">
                  {(summaryStats.summary_stats.on_time_rate * 100).toFixed(1)}%
                </div>
                <div className="progress-container">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${
                        summaryStats.summary_stats.on_time_rate * 100
                      }%`,
                    }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Year Summary Card - always shows yearly data */}
          <div className="summary-card year">
            <h3 className="summary-title year">Year Summary</h3>
            <div className="summary-item">
              <span className="summary-label">Total:</span>
              <span className="summary-value year">
                {formatCurrency(
                  parseFloat(
                    String(summaryStats?.summary_stats.total_pf || 0)
                  ) +
                    parseFloat(
                      String(summaryStats?.summary_stats.total_esi || 0)
                    )
                )}
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Submissions:</span>
              <span className="summary-value year">
                {(summaryStats?.summary_stats.pf_submissions || 0) +
                  (summaryStats?.summary_stats.esi_submissions || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* <div className="tabs-container">
        <nav className="tabs-nav">
          <button
            onClick={() => setActiveTab("overview")}
            className={`tab-button ${activeTab === "overview" ? "active" : ""}`}
          >
            Monthly Overview
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={`tab-button ${activeTab === "submissions" ? "active" : ""
              }`}
          >
            Submissions Timeline
          </button>
          <button
            onClick={() => setActiveTab("delayed")}
            className={`tab-button ${activeTab === "delayed" ? "active" : ""}`}
          >
            Delayed Submissions
          </button>
        </nav>
      </div> */}
      <div className="tabs-container">
        <nav className="tabs-nav">
          <button
            onClick={() => setActiveTab("overview")}
            className={`tab-button ${
              activeTab === "overview" ? "active" : ""
            }`}>
            Monthly Overview
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={`tab-button ${
              activeTab === "submissions" ? "active" : ""
            }`}>
            Submissions Timeline
          </button>
          <button
            onClick={() => setActiveTab("delayed")}
            className={`tab-button ${activeTab === "delayed" ? "active" : ""}`}>
            Delayed Submissions
          </button>
        </nav>
      </div>

      <div className="dashboard-content">
        {activeTab === "overview" && (
          <div className="panel">
            <h2 className="panel-title">Monthly Remittance Amounts</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fill: "#6b7280" }} />
                  <YAxis tick={{ fill: "#6b7280" }} />
                  <Tooltip
                    formatter={(value) => [
                      formatCurrency(Number(value)),
                      "Amount",
                    ]}
                    labelFormatter={(month) => `${month} ${summaryStats.year}`}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.375rem",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "10px" }} />
                  <Bar
                    dataKey="PF"
                    name="PF"
                    fill="#8884d8"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                  />
                  <Bar
                    dataKey="ESI"
                    name="ESI"
                    fill="#82ca9d"
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === "submissions" && (
          <div className="panel">
            <SubmissionTimeline year={selectedYear} />
          </div>
        )}

        {activeTab === "delayed" && (
          <div className="panel">
            <h2 className="panel-title">
              Delayed Submissions for {selectedYear}
            </h2>
            {/* Use the new DelayedSubmissionsChart component */}
            <DelayedSubmissionsChart currentYear={selectedYear} />
          </div>
        )}
      </div>

      <div className="dashboard-footer">
        <p className="footer-text">
          Data last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
