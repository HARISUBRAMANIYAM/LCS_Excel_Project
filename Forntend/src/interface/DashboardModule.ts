
export type MonthLabel =
  | 'Apr' | 'May' | 'Jun' | 'Jul' | 'Aug' | 'Sep'
  | 'Oct' | 'Nov' | 'Dec' | 'Jan' | 'Feb' | 'Mar';

// Full month names for mapping
export type FullMonthName = 
  | 'January' | 'February' | 'March' | 'April' | 'May' | 'June'
  | 'July' | 'August' | 'September' | 'October' | 'November' | 'December';

export interface MonthlyAmounts {
  labels: MonthLabel[];
  datasets: {
    PF: number[];
    ESI: number[];
  };
}

export interface SummaryStats {
  total_pf: string;
  total_esi: string;
  pf_submissions: number;
  esi_submissions: number;
  on_time_rate: number;
  avg_pf: string;
  avg_esi: string;
}

export interface DelayEntry {
  delay_days: number;
}

// Upload day structure for timeline
export interface UploadDay {
  month: FullMonthName;
  day: number;
}

export interface SummaryStatsResponse {
  summary_stats: SummaryStats;
  monthly_amounts: MonthlyAmounts;
  year: number;
}

// Year list response
export interface YearListResponse {
  yearlist: number[];
}

export interface MonthlyAmountResponse extends MonthlyAmounts {}

export interface UploadsByYearDaysResponse {
  pf: UploadDay[];
  esi: UploadDay[];
}

export interface DelayedSubmissionModeResponse {
  labels: MonthLabel[];
  datasets: {
    PF: DelayEntry[][];
    ESI: DelayEntry[][];
  };
}


export interface RemittanceDashboardProps {
}

export interface MonthlyOverviewProps {
  data: MonthlyAmounts;
  summaryStats: SummaryStatsResponse | null;
  formatCurrency: (value: any) => string;
}

export interface SubmissionTimelineProps {
  year: number;
}

// Props for DelayedSubmissions component
export interface DelayedSubmissionsProps {
  year: number;
}

export interface TimelineDataPoint {
  x: number;
  y: number;
  month: FullMonthName;
  day: number;
}

export interface DelayedDataPoint {
  x: number;
  y: number;
  month: MonthLabel;
  delayDays: number;
}

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

export interface TimelineChartData {
  labels: string[];
  datasets: TimelineChartDataset[];
}

export interface DelayedChartDataset {
  label: string;
  data: DelayedDataPoint[];
  backgroundColor: string;
  borderColor: string;
  pointRadius: number;
  pointHoverRadius: number;
}

export interface DelayedChartData {
  datasets: DelayedChartDataset[];
}


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

// Chart types
export type ChartType = 'line' | 'bar' | 'scatter';

// Submission types
export type SubmissionType = 'pf' | 'esi';

// Card class names
export type CardClassName = 'pf-card' | 'esi-card' | 'performance-card' | 'year-card';

// Message severity levels
export type MessageSeverity = 'success' | 'info' | 'warn' | 'error';



export const months :MonthOption[] = [
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

 export const viewOptions: ViewOption[] = [
      { label: 'PF', value: 'pf' },
      { label: 'ESI', value: 'esi' }
    ];


export const monthToNumber:MonthToNumberMap = {
        January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
        July: 7, August: 8, September: 9, October: 10, November: 11, December: 12
      };
    
export const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    