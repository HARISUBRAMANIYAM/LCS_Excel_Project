from pydantic import BaseModel
from typing import List, Dict, Optional

class MonthlyAmountData(BaseModel):
    labels: List[str]
    datasets: Dict[str, List[float]]

class SubmissionPoint(BaseModel):
    x: int
    y: float
    r: int

class SubmissionData(BaseModel):
    labels: List[str]
    points: List[List[SubmissionPoint]]

class DelayedSubmission(BaseModel):
    delay_days: int

class DelayedData(BaseModel):
    labels: List[str]
    datasets: Dict[str, List[List[DelayedSubmission]]]

class SummaryStats(BaseModel):
    total_pf: str
    total_esi: str
    pf_submissions: int
    esi_submissions: int
    on_time_rate: float
    avg_pf: str
    avg_esi: str

class SummaryStatsResponse(BaseModel):
    summary_stats: SummaryStats
    monthly_amounts: MonthlyAmountData
    year: int

class SubmissionsDataResponse(BaseModel):
    pf_submissions: SubmissionData
    esi_submissions: SubmissionData
    delayed_submissions: DelayedData
    year: int

class Years(BaseModel):
    yearlist: List[int]

class DelayedChartResponse(BaseModel):
    labels: List[str]
    datasets: Dict[str, List[List[Dict[str, int]]]]