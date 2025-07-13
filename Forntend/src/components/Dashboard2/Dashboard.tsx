import { Card } from "primereact/card";
import { Dropdown, type DropdownChangeEvent } from "primereact/dropdown";
import { Message } from "primereact/message";
import { ProgressBar } from "primereact/progressbar";
import { Skeleton } from "primereact/skeleton";
import { TabPanel, TabView } from "primereact/tabview";
import { useEffect, useState } from "react";
import api from "../../services/api";
import type { CurrentMonthData, MonthlyAmounts, MonthOption, SummaryCardData, SummaryStatsResponse, TabChangeEvent, YearOption } from "./DashBoardInterface";
import DelayedSubmissions from "./DelayedSubmission";
import MonthlyOverview from "./MonthlyView";
import SubmissionTimeline from "./SubmissionTimeline";

const RemittanceDashboard = () => {
  const [summaryStats, setSummaryStats] = useState<SummaryStatsResponse | null>(
    null
  );
  // const [monthlyAmountData, setMonthlyAmountData] = useState<MonthlyAmounts[]>([]);
  const [monthlyAmountData, setMonthlyAmountData] = useState<MonthlyAmounts>({
  labels: [],
  datasets: {
    PF: [],
    ESI: []
  }
});
  const [yearlist, setYearlist] = useState<YearOption[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(-1);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const months :MonthOption[] = [
    { label: "All Months", value: -1 },
    { label: "Apr", value: 0 },
    { label: "May", value: 1 },
    { label: "Jun", value: 2 },
    { label: "Jul", value: 3 },
    { label: "Aug", value: 4 },
    { label: "Sep", value: 5 },
    { label: "Oct", value: 6 },
    { label: "Nov", value: 7 },
    { label: "Dec", value: 8 },
    { label: "Jan", value: 9 },
    { label: "Feb", value: 10 },
    { label: "Mar", value: 11 },
  ];

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [yearlistResponse, summaryResponse, monthlyResponse] =
        await Promise.all([
          api.get("/dashboard/year_list"),
          api.get(`/dashboard/summary_stats?year=${selectedYear}`),
          api.get(`/dashboard/monthly_amounts?year=${selectedYear}`),
        ]);

      setYearlist(
        yearlistResponse.data.yearlist.map((year:any) => ({
          label: year,
          value: year,
        }))
      );
      setSummaryStats(summaryResponse.data);
      setMonthlyAmountData(monthlyResponse.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: any):string => {
    if (value === null || value === undefined) return "₹0";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    return numValue.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  };

  const getCurrentMonthData = ():CurrentMonthData| null => {
    if (selectedMonth === -1 || !summaryStats) return null;
    return {
      pfAmount: summaryStats.monthly_amounts.datasets.PF[selectedMonth],
      esiAmount: summaryStats.monthly_amounts.datasets.ESI[selectedMonth],
      monthName: summaryStats.monthly_amounts.labels[selectedMonth],
    };
  };

  const getSummaryCardData = ():SummaryCardData[] => {
    const currentMonthData = getCurrentMonthData();
    const stats = summaryStats?.summary_stats;

    return [
      {
        title:
          selectedMonth === -1
            ? "PF Remittance (Year)"
            : `PF Remittance (${currentMonthData?.monthName})`,
        total:
          selectedMonth === -1
            ? formatCurrency(stats?.total_pf)
            : formatCurrency(currentMonthData?.pfAmount ?? 0),
        avg: formatCurrency(stats?.avg_pf),
        submissions: stats?.pf_submissions,
        className: "pf-card",
      },
      {
        title:
          selectedMonth === -1
            ? "ESI Remittance (Year)"
            : `ESI Remittance (${currentMonthData?.monthName})`,
        total:
          selectedMonth === -1
            ? formatCurrency(stats?.total_esi)
            : formatCurrency(currentMonthData?.esiAmount ?? 0),
        avg: formatCurrency(stats?.avg_esi),
        submissions: stats?.esi_submissions,
        className: "esi-card",
      },
      {
        title: "Performance",
        onTimeRate: (stats?.on_time_rate ? stats.on_time_rate * 100 : 0 ).toFixed(1),
        className: "performance-card",
      },
      {
        title: "Year Summary",
        total: formatCurrency(
          parseFloat(String(stats?.total_pf || 0)) +
            parseFloat(String(stats?.total_esi || 0))
        ),
        totalSubmissions:
          (stats?.pf_submissions || 0) + (stats?.esi_submissions || 0),
        className: "year-card",
      },
    ];
  };
const handleYearChange = (e: DropdownChangeEvent): void => {
    setSelectedYear(e.value);
  };

  const handleMonthChange = (e: DropdownChangeEvent): void => {
    setSelectedMonth(e.value);
  };

  const handleTabChange = (e: TabChangeEvent): void => {
    setActiveIndex(e.index);
  };
  if (loading) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <Skeleton height="4rem" className="mb-3"></Skeleton>
            <div className="row">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="col-md-3 mb-3">
                  <Skeleton height="8rem"></Skeleton>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <Message severity="error" text={error} />
      </div>
    );
  }

  return (
    <div className="container-fluid dashboard-container">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-md-8">
          <h1 className="dashboard-title">
            Remittance Dashboard {selectedYear}
          </h1>
        </div>
        <div className="col-md-4">
          <div className="row">
            <div className="col-6">
              <Dropdown
                value={selectedYear}
                options={yearlist}
                onChange={handleYearChange}
                placeholder="Select Year"
                className="w-100"
              />
            </div>
            <div className="col-6">
              <Dropdown
                value={selectedMonth}
                options={months}
                onChange={handleMonthChange}
                placeholder="Select Month"
                className="w-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row mb-4">
        {getSummaryCardData().map((card, index) => (
          <div key={index} className="col-md-3 mb-3">
            <Card className={`summary-card ${card.className}`}>
              <div className="card-header">
                <h6 className="card-title">{card.title}</h6>
              </div>
              <div className="card-body">
                {card.total && (
                  <div className="summary-item">
                    <span className="summary-label">Total:</span>
                    <span className="summary-value">{card.total}</span>
                  </div>
                )}
                {card.avg && (
                  <div className="summary-item">
                    <span className="summary-label">Avg:</span>
                    <span className="summary-value">{card.avg}</span>
                  </div>
                )}
                {card.submissions && (
                  <div className="summary-item">
                    <span className="summary-label">Submissions:</span>
                    <span className="summary-value">{card.submissions}</span>
                  </div>
                )}
                {card.onTimeRate && (
                  <div className="summary-item">
                    <span className="summary-label">On-Time Rate:</span>
                    <div>
                      <div className="summary-value">{card.onTimeRate}%</div>
                      <ProgressBar
                        value={parseFloat(card.onTimeRate)}
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}
                {card.totalSubmissions && (
                  <div className="summary-item">
                    <span className="summary-label">Total Submissions:</span>
                    <span className="summary-value">
                      {card.totalSubmissions}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="row">
        <div className="col-12">
          <TabView
            activeIndex={activeIndex}
            onTabChange={handleTabChange}>
            <TabPanel header="Monthly Overview">
              <MonthlyOverview
                data={monthlyAmountData}
                summaryStats={summaryStats}
                formatCurrency={formatCurrency}
              />
            </TabPanel>
            <TabPanel header="Submissions Timeline">
              <SubmissionTimeline year={selectedYear} />
            </TabPanel>
            <TabPanel header="Delayed Submissions">
              <DelayedSubmissions year={selectedYear} />
            </TabPanel>
          </TabView>
        </div>
      </div>

      {/* Footer */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="dashboard-footer">
            <p className="footer-text">
              Data last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemittanceDashboard;
