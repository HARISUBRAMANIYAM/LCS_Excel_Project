from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
from typing import Optional
import asyncio
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, text
from dateutil.relativedelta import relativedelta

from database.models import ProcessedFilePF, ProcessedFileESI, UserModel
from schemas.dashboard import (
    MonthlyAmountData,
    SummaryStatsResponse,
    SubmissionsDataResponse,
    Years,
    DelayedChartResponse,
    SummaryStats,
)
from core.dependencies import get_db, get_current_user
from services.dashboard import (
    get_monthly_amounts,
    get_summary_stats,
    get_submission_timeline_data,
    get_delayed_submissions,
    get_all_years,
    get_delayed_submissions_chart_data,
    get_avg_remittance_day_by_year,  # Add this import
)

router = APIRouter()


@router.get("/monthly_amounts", response_model=MonthlyAmountData)
async def get_monthly_amounts_endpoint(
    year: int = Query(None, description="Filter by specific year"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_year = year or datetime.now().year
    return await get_monthly_amounts(db, current_year, current_user)


@router.get("/summary_stats", response_model=SummaryStatsResponse)
async def get_summary_stats_endpoint(
    year: int = Query(None, description="Filter by specific year"),
    month: int = Query(None, description="Optional month filter (1-12)"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_year = year or datetime.now().year

    # Get the raw summary stats
    summary_data = await get_summary_stats(db, current_year, month, current_user)
    monthly_data = await get_monthly_amounts(db, current_year, current_user)

    # Create the proper response structure
    return SummaryStatsResponse(
        summary_stats=summary_data, monthly_amounts=monthly_data, year=current_year
    )


@router.get("/submissions_data", response_model=SubmissionsDataResponse)
async def get_submissions_data_endpoint(
    year: int = Query(None, description="Filter by specific year"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_year = year or datetime.now().year

    pf_submissions, esi_submissions, delayed_data = await asyncio.gather(
        get_submission_timeline_data(db, ProcessedFilePF, current_year, current_user),
        get_submission_timeline_data(db, ProcessedFileESI, current_year, current_user),
        get_delayed_submissions(db, current_year, current_user),
    )

    return SubmissionsDataResponse(
        pf_submissions=pf_submissions,
        esi_submissions=esi_submissions,
        delayed_submissions=delayed_data,
        year=current_year,
    )


@router.get("/year_list", response_model=Years)
async def get_all_years_endpoint(
    current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)
):
    return await get_all_years(current_user, db)


@router.get("/yearly_summary", response_model=SummaryStatsResponse)
async def get_yearly_summary_endpoint(
    year: int = Query(None, description="Filter by specific year"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_year = year or datetime.now().year

    # Get the raw summary stats
    summary_data = await get_summary_stats(db, current_year, None, current_user)
    monthly_data = await get_monthly_amounts(db, current_year, current_user)

    # Create the proper response structure
    return SummaryStatsResponse(
        summary_stats=summary_data, monthly_amounts=monthly_data, year=current_year
    )


@router.get("/delayed-submissions_mode", response_model=DelayedChartResponse)
async def delayed_submissions_chart_endpoint(
    year: int = Query(None, description="Filter by specific year"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_year = year or datetime.now().year
    return await get_delayed_submissions_chart_data(db, current_year, current_user)


@router.get("/uploads/by-year-days")
async def get_avg_remittance_day_by_year_endpoint(
    year: int = Query(..., description="Year to filter remittance dates"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Use the fixed function from services
    return await get_avg_remittance_day_by_year(db, year, current_user)
