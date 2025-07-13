// // Label type for months
// export type MonthLabel =
//   | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep'
//   | 'Oct' | 'Nov' | 'Dec' | 'Jan' | 'Feb' | 'Mar';

// // Monthly amounts data
// export interface MonthlyAmounts {
//   labels: MonthLabel[];
//   datasets: {
//     PF: number[];
//     ESI: number[];
//   };
// }

// // Summary statistics
// export interface SummaryStats {
//   total_pf: string;
//   total_esi: string;
//   pf_submissions: number;
//   esi_submissions: number;
//   on_time_rate: number;
//   avg_pf: string;
//   avg_esi: string;
// }

// // Yearly summary response
// export interface YearlySummaryResponse {
//   summary_stats: SummaryStats;
//   monthly_amounts: MonthlyAmounts;
//   year: number;
// }

// // Submission point for bubble chart
// export interface SubmissionPoint {
//   x: number;  // day of the month
//   y: number;  // amount
//   r: number;  // radius of bubble
// }

// // PF & ESI submission data structure
// export interface SubmissionsData {
//   pf_submissions: {
//     labels: MonthLabel[];
//     points: SubmissionPoint[][];
//   };
//   esi_submissions: {
//     labels: MonthLabel[];
//     points: SubmissionPoint[][];
//   };
//   delayed_submissions: {
//     labels: MonthLabel[];
//     datasets: {
//       PF: DelayEntry[][];
//       ESI: DelayEntry[][];
//     };
//   };
//   year: number;
// }

// // Delay data for each submission
// export interface DelayEntry {
//   delay_days: number;
// }

// // Year list response
// export interface YearListResponse {
//   yearlist: number[];
// }

// // Upload days for a given year (e.g., 2025)
// export interface UploadsByYearDays {
//   pf: UploadDay[];
//   esi: UploadDay[];
// }

// export interface UploadDay {
//   month: string; // e.g., "January"
//   day: number;   // e.g., 15
// }

// // Monthly amount endpoint response
// export interface MonthlyAmountResponse extends MonthlyAmounts {}

// // Summary stats endpoint response (combined with monthly data)
// export interface SummaryStatsResponse {
//   summary_stats: SummaryStats;
//   monthly_amounts: MonthlyAmounts;
//   year: number;
// }

// // Delayed submission mode response
// export interface DelayedSubmissionModeResponse {
//   labels: MonthLabel[];
//   datasets: {
//     PF: DelayEntry[][];
//     ESI: DelayEntry[][];
//   };
// }

// =============================================================================
// DASHBOARD INTERFACE TYPES
// =============================================================================

// Month labels used throughout the dashboard
export type MonthLabel =
  | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep'
  | 'Oct' | 'Nov' | 'Dec' | 'Jan' | 'Feb' | 'Mar';

// Full month names for mapping
export type FullMonthName = 
  | 'January' | 'February' | 'March' | 'April' | 'May' | 'June'
  | 'July' | 'August' | 'September' | 'October' | 'November' | 'December';

// =============================================================================
// CORE DATA STRUCTURES
// =============================================================================

// Monthly amounts data structure
export interface MonthlyAmounts {
  labels: MonthLabel[];
  datasets: {
    PF: number[];
    ESI: number[];
  };
}

// Summary statistics for the dashboard
export interface SummaryStats {
  total_pf: string;
  total_esi: string;
  pf_submissions: number;
  esi_submissions: number;
  on_time_rate: number;
  avg_pf: string;
  avg_esi: string;
}

// Delay entry for submissions
export interface DelayEntry {
  delay_days: number;
}

// Upload day structure for timeline
export interface UploadDay {
  month: FullMonthName;
  day: number;
}

// =============================================================================
// API RESPONSE INTERFACES
// =============================================================================

// Main summary stats response (used in RemittanceDashboard)
export interface SummaryStatsResponse {
  summary_stats: SummaryStats;
  monthly_amounts: MonthlyAmounts;
  year: number;
}

// Year list response
export interface YearListResponse {
  yearlist: number[];
}

// Monthly amount response (standalone)
export interface MonthlyAmountResponse extends MonthlyAmounts {}

// Upload days response for timeline
export interface UploadsByYearDaysResponse {
  pf: UploadDay[];
  esi: UploadDay[];
}

// Delayed submissions response
export interface DelayedSubmissionModeResponse {
  labels: MonthLabel[];
  datasets: {
    PF: DelayEntry[][];
    ESI: DelayEntry[][];
  };
}

// =============================================================================
// COMPONENT PROP INTERFACES
// =============================================================================

// Props for RemittanceDashboard component
export interface RemittanceDashboardProps {
  // No props - this is a top-level component
}

// Props for MonthlyOverview component
export interface MonthlyOverviewProps {
  data: MonthlyAmounts;
  summaryStats: SummaryStatsResponse | null;
  formatCurrency: (value: any) => string;
}

// Props for SubmissionTimeline component
export interface SubmissionTimelineProps {
  year: number;
}

// Props for DelayedSubmissions component
export interface DelayedSubmissionsProps {
  year: number;
}

// =============================================================================
// CHART DATA INTERFACES
// =============================================================================

// Timeline chart data point
export interface TimelineDataPoint {
  x: number;
  y: number;
  month: FullMonthName;
  day: number;
}

// Delayed submissions chart data point
export interface DelayedDataPoint {
  x: number;
  y: number;
  month: MonthLabel;
  delayDays: number;
}

// Chart dataset structure for timeline
export interface TimelineChartDataset {
  label: string;
  data: Array<{ x: number; y: number }>;
  borderColor: string;
  backgroundColor: string;
  fill: boolean;
  tension?: number;
  borderDash?: number[];
  pointRadius?: number;
}

// Chart data structure for timeline
export interface TimelineChartData {
  labels: string[];
  datasets: TimelineChartDataset[];
}

// Chart dataset structure for delayed submissions
export interface DelayedChartDataset {
  label: string;
  data: DelayedDataPoint[];
  backgroundColor: string;
  borderColor: string;
  pointRadius: number;
  pointHoverRadius: number;
}

// Chart data structure for delayed submissions
export interface DelayedChartData {
  datasets: DelayedChartDataset[];
}

// =============================================================================
// DASHBOARD STATE INTERFACES
// =============================================================================

// Month option for dropdown
export interface MonthOption {
  label: string;
  value: number;
}

// Year option for dropdown
export interface YearOption {
  label: number;
  value: number;
}

// View options for charts
export interface ViewOption {
  label: string;
  value: 'pf' | 'esi';
}

// Summary card data structure
export interface SummaryCardData {
  title: string;
  total?: string;
  avg?: string;
  submissions?: number;
  onTimeRate?: string;
  totalSubmissions?: number;
  className: string;
}

// Current month data structure
export interface CurrentMonthData {
  pfAmount: number;
  esiAmount: number;
  monthName: MonthLabel;
}

// =============================================================================
// UTILITY INTERFACES
// =============================================================================

// API error structure
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// Loading state
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
}

// Month to number mapping
export interface MonthToNumberMap {
  [key: string]: number;
}

// =============================================================================
// CHART CONFIGURATION INTERFACES
// =============================================================================

// Chart tooltip callback context
export interface ChartTooltipContext {
  datasetIndex: number;
  raw: any;
  parsed: {
    x: number;
    y: number;
  };
  dataset: {
    label: string;
  };
}

// Chart options structure
export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: {
    legend: {
      position: string;
    };
    title: {
      display: boolean;
      text: string;
    };
    tooltip: {
      callbacks: {
        label: (context: ChartTooltipContext) => string;
      };
    };
  };
  scales: {
    x: {
      type?: string;
      position?: string;
      min?: number;
      max?: number;
      ticks: {
        stepSize?: number;
        callback?: (value: number) => string;
      };
      title: {
        display: boolean;
        text: string;
      };
    };
    y: {
      beginAtZero?: boolean;
      min?: number;
      max?: number;
      reverse?: boolean;
      ticks: {
        stepSize?: number;
        callback?: (value: number) => string;
      };
      title: {
        display: boolean;
        text: string;
      };
    };
  };
}

// =============================================================================
// FORM AND INTERACTION INTERFACES
// =============================================================================

// Tab change event
export interface TabChangeEvent {
  index: number;
}

// Dropdown change event
export interface DropdownChangeEvent {
  value: any;
  originalEvent?: Event;
}

// Select button change event
export interface SelectButtonChangeEvent {
  value: 'pf' | 'esi';
  originalEvent?: Event;
}

// =============================================================================
// CONSTANTS AND ENUMS
// =============================================================================

// Chart types
export type ChartType = 'line' | 'bar' | 'scatter';

// Submission types
export type SubmissionType = 'pf' | 'esi';

// Card class names
export type CardClassName = 'pf-card' | 'esi-card' | 'performance-card' | 'year-card';

// Message severity levels
export type MessageSeverity = 'success' | 'info' | 'warn' | 'error';