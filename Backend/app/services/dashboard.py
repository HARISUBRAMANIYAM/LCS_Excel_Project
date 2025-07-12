from datetime import datetime, date
from typing import Dict, List, Optional
import calendar
from collections import defaultdict
from schemas.dashboard import Years
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, cast, Date, case, text
from sqlalchemy.sql.expression import literal

from database.models import ProcessedFilePF, ProcessedFileESI, UserModel
from schemas.dashboard import (
    MonthlyAmountData,
    SubmissionData,
    DelayedData,
    DelayedSubmission
)

def apply_user_filter(query, model, current_user):
    """Apply user-based filtering to queries"""
    if current_user.role != "admin":
        return query.filter(model.user_id == current_user.id)
    return query

def get_financial_year_dates(year: int) -> tuple:

    start_date = date(year - 1, 4, 1)  # April 1st of previous year
    end_date = date(year, 3, 31)       # March 31st of given year
    return start_date, end_date

# def parse_date_string(date_str: str, format_str: str = "DD-MM-YYYY") -> date:
#     """Parse date string to date object"""
#     if not date_str:
#         return None
#     try:
#         if format_str == "DD-MM-YYYY":
#             return datetime.strptime(date_str, "%d-%m-%Y").date()
#         elif format_str == "MM-YYYY":
#             return datetime.strptime(f"01-{date_str}", "%d-%m-%Y").date()
#         else:
#             return datetime.strptime(date_str, format_str).date()
#     except Exception as e:
#         print("parse Error :",e)
#         return None
    
def parse_db_date(date_input) -> Optional[date]:
    if isinstance(date_input, (datetime, date)):
        return date_input
    
    try:
        # Fix the format to match your DB string format
        if isinstance(date_input, str):
            rem_date = datetime.strptime(date_input, "%Y-%m-%d").date()
            return rem_date
    except Exception as e:
        print("Parse error:", e)
        return None
def parse_upload_month(month_input) -> Optional[date]:
    """Converts 'MM-YYYY' string to date or returns existing date object"""
    try:
        if isinstance(month_input, date):  # Already a date, return as-is
            return month_input
        elif isinstance(month_input, str):  # Expected format like "04-2024"
            return datetime.strptime(f"15-{month_input}", "%d-%m-%Y").date()
    except Exception as e:
        print("Parse error [Upload Month]:", e)
        return None
    
def get_month_from_string(month_str: str) -> int:
    """Convert MM-YYYY string to month number"""
    if not month_str:
        return None
    try:
        return int(month_str.split('-')[0])
    except:
        return None
def process_remittance_data(queryset, current_user, model, year_range, label):
    """Helper to process PF or ESI remittance delays"""
    dataset = [[] for _ in range(12)]
    query = queryset.filter(
        model.remittance_submitted == True,
        model.remittance_date.isnot(None)
    )
    query = apply_user_filter(query, model, current_user)

    for upload_month, remittance_date, created_at in query.all():
        rem_date = parse_upload_month(remittance_date)
        if not rem_date or not (year_range[0] <= rem_date <= year_range[1]):
            continue

        # Parse upload_month -> format "15-MM-YYYY"
        if upload_month:
            upload_date = parse_upload_month(upload_month)
        else:
            upload_date = created_at.date() if created_at else None

        delay_days = (rem_date - upload_date).days if upload_date else 0

        month_idx = rem_date.month - 4 if rem_date.month >= 4 else rem_date.month + 8
        dataset[month_idx].append({"delay_days": delay_days})
        print(f"[{label}] Delay: {delay_days} days at index {month_idx}")
    return dataset

async def get_monthly_amounts(db: Session, year: int, current_user: UserModel) -> MonthlyAmountData:
    """Get monthly remittance amounts for financial year"""
    start_date, end_date = get_financial_year_dates(year)
    
    # Financial year month labels (April to March)
    month_labels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", 
                   "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
    
    # PF amounts - Fixed boolean comparison
    pf_query = db.query(
        ProcessedFilePF.remittance_month,
        func.sum(ProcessedFilePF.remittance_amount).label("total_amount")
    ).filter(
        ProcessedFilePF.remittance_submitted == True,
        ProcessedFilePF.remittance_amount.isnot(None),
        ProcessedFilePF.remittance_date.isnot(None)
    )
    pf_query = apply_user_filter(pf_query, ProcessedFilePF, current_user)
    pf_results = pf_query.group_by(ProcessedFilePF.remittance_month).all()

    # ESI amounts - Fixed boolean comparison
    esi_query = db.query(
        ProcessedFileESI.remittance_month,
        func.sum(ProcessedFileESI.remittance_amount).label("total_amount")
    ).filter(
        ProcessedFileESI.remittance_submitted == True,
        ProcessedFileESI.remittance_amount.isnot(None),
        ProcessedFileESI.remittance_date.isnot(None)
    )
    esi_query = apply_user_filter(esi_query, ProcessedFileESI, current_user)
    esi_results = esi_query.group_by(ProcessedFileESI.remittance_month).all()

    # Initialize data for financial year months (April to March)
    pf_data = [0.0] * 12
    esi_data = [0.0] * 12

    # Process PF results
    for result in pf_results:
        if result.remittance_month:
            remittance_date = parse_upload_month(result.remittance_month)
            if remittance_date and start_date <= remittance_date <= end_date:
                month_num = remittance_date.month
                # Map to financial year index (April=0, May=1, ..., March=11)
                if month_num >= 4:
                    month_idx = month_num - 4  # Apr=0, May=1, ..., Dec=8
                else:
                    month_idx = month_num + 8  # Jan=9, Feb=10, Mar=11
                pf_data[month_idx] = float(result.total_amount or 0)

    # Process ESI results
    for result in esi_results:
        if result.remittance_month:
            remittance_date = parse_upload_month(result.remittance_month)
            if remittance_date and start_date <= remittance_date <= end_date:
                month_num = remittance_date.month
                # Map to financial year index
                if month_num >= 4:
                    month_idx = month_num - 4
                else:
                    month_idx = month_num + 8
                esi_data[month_idx] = float(result.total_amount or 0)

    return MonthlyAmountData(
        labels=month_labels,
        datasets={"PF": pf_data, "ESI": esi_data}
    )

async def get_summary_stats(db: Session, year: int, month: Optional[int], current_user: UserModel) -> Dict:
    """Get summary statistics for financial year"""
    start_date, end_date = get_financial_year_dates(year)
    
    # PF Summary - Fixed boolean comparison
    pf_query = db.query(
        ProcessedFilePF.remittance_date,
        ProcessedFilePF.remittance_amount,
        ProcessedFilePF.filename
    ).filter(
        ProcessedFilePF.remittance_submitted == True,
        ProcessedFilePF.remittance_date.isnot(None)
    )
    pf_query = apply_user_filter(pf_query, ProcessedFilePF, current_user)
    pf_results = pf_query.all()

    # Filter PF results for financial year
    pf_amounts = []
    pf_count = 0
    for result in pf_results:
        if result.remittance_date:
            rem_date = parse_db_date(result.remittance_date)
            if rem_date and start_date <= rem_date <= end_date:
                pf_count += 1
                if result.remittance_amount:
                    pf_amounts.append(result.remittance_amount)

    # ESI Summary - Fixed boolean comparison
    esi_query = db.query(
        ProcessedFileESI.remittance_date,
        ProcessedFileESI.remittance_amount,
        ProcessedFileESI.filename
    ).filter(
        ProcessedFileESI.remittance_submitted == True,
        ProcessedFileESI.remittance_date.isnot(None)
    )
    esi_query = apply_user_filter(esi_query, ProcessedFileESI, current_user)
    esi_results = esi_query.all()

    # Filter ESI results for financial year
    esi_amounts = []
    esi_count = 0
    for result in esi_results:
        if result.remittance_date:
            rem_date = parse_db_date(result.remittance_date)
            if rem_date and start_date <= rem_date <= end_date:
                esi_count += 1
                if result.remittance_amount:
                    esi_amounts.append(result.remittance_amount)

    # Calculate totals and averages
    total_pf = sum(pf_amounts) if pf_amounts else 0
    total_esi = sum(esi_amounts) if esi_amounts else 0
    avg_pf = total_pf / len(pf_amounts) if pf_amounts else 0
    avg_esi = total_esi / len(esi_amounts) if esi_amounts else 0

    # On-time calculation (submissions within the month)
    on_time_count = 0
    for result in pf_results:
        if result.remittance_date:
            rem_date = parse_db_date(result.remittance_date)
            if rem_date and start_date <= rem_date <= end_date:
                # Consider on-time if submitted within reasonable time
                on_time_count += 1

    on_time_rate = (on_time_count / pf_count) if pf_count > 0 else 0

    return {
        "total_pf": str(total_pf),
        "total_esi": str(total_esi),
        "pf_submissions": pf_count,
        "esi_submissions": esi_count,
        "on_time_rate": on_time_rate,
        "avg_pf": str(avg_pf),
        "avg_esi": str(avg_esi),
    }

async def get_submission_timeline_data(db: Session, model, year: int, current_user: UserModel) -> SubmissionData:
    """Get submission timeline data for financial year"""
    start_date, end_date = get_financial_year_dates(year)
    
    # Fixed boolean comparison
    query = db.query(
        model.upload_month,
        model.remittance_date,
        model.remittance_amount
    ).filter(
        model.remittance_submitted == True,
        model.remittance_date.isnot(None),
        model.remittance_amount.isnot(None)
    )
    query = apply_user_filter(query, model, current_user)
    results = query.all()
    print(results)

    # Financial year month labels
    month_labels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", 
                   "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
    points = [[] for _ in range(12)]

    for result in results:
        if result.remittance_date:
            rem_date = parse_db_date(result.remittance_date)
            if rem_date and start_date <= rem_date <= end_date:
                month_num = rem_date.month
                day = rem_date.day
                print("days",day)
                
                # Map to financial year index
                if month_num >= 4:
                    month_idx = month_num - 4
                else:
                    month_idx = month_num + 8
                
                points[month_idx].append({
                    "x": day,
                    "y": float(result.remittance_amount),
                    "r": 5
                })

    return SubmissionData(labels=month_labels, points=points)

async def get_delayed_submissions(db: Session, year: int, current_user: UserModel) -> DelayedData:
    """Get delayed submissions data for financial year - allows negative delay values"""
    start_date, end_date = get_financial_year_dates(year)
    
    month_labels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", 
                   "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
    
    # PF Delays - Fixed boolean comparison
    pf_query = db.query(
        ProcessedFilePF.created_at,
        ProcessedFilePF.remittance_date,
        ProcessedFilePF.upload_month
    ).filter(
        ProcessedFilePF.remittance_submitted == True,
        ProcessedFilePF.remittance_date.isnot(None)
    )
    pf_query = apply_user_filter(pf_query, ProcessedFilePF, current_user)
    pf_results = pf_query.all()

    pf_data = [[] for _ in range(12)]
    for created_at, remittance_date, upload_month in pf_results:
        if remittance_date:
            rem_date = parse_db_date(remittance_date)
            if rem_date and start_date <= rem_date <= end_date:
                # Calculate delay based on upload month if available, otherwise use created_at
                if upload_month:
                    # Use 15th of upload month as reference date
                    upload_date = parse_upload_month(upload_month)
                    if upload_date:
                        delay_days = (rem_date - upload_date).days
                    else:
                        delay_days = (rem_date - created_at.date()).days if created_at else 0
                else:
                    delay_days = (rem_date - created_at.date()).days if created_at else 0
                
                month_num = rem_date.month
                
                # Map to financial year index
                if month_num >= 4:
                    month_idx = month_num - 4
                else:
                    month_idx = month_num + 8
                
                # Allow negative delay values (early submissions)
                pf_data[month_idx].append(DelayedSubmission(delay_days=delay_days))

    # ESI Delays - Fixed boolean comparison
    esi_query = db.query(
        ProcessedFileESI.created_at,
        ProcessedFileESI.remittance_date,
        ProcessedFileESI.upload_month
    ).filter(
        ProcessedFileESI.remittance_submitted == True,
        ProcessedFileESI.remittance_date.isnot(None)
    )
    esi_query = apply_user_filter(esi_query, ProcessedFileESI, current_user)
    esi_results = esi_query.all()

    esi_data = [[] for _ in range(12)]
    for created_at, remittance_date, upload_month in esi_results:
        if remittance_date:
            rem_date = parse_db_date(remittance_date)
            if rem_date and start_date <= rem_date <= end_date:
                # Calculate delay based on upload month if available, otherwise use created_at
                if upload_month:
                    # Use 15th of upload month as reference date
                    upload_date = parse_upload_month(upload_month)
                    if upload_date:
                        delay_days = (rem_date - upload_date).days
                    else:
                        delay_days = (rem_date - created_at.date()).days if created_at else 0
                else:
                    delay_days = (rem_date - created_at.date()).days if created_at else 0
                
                month_num = rem_date.month
                
                # Map to financial year index
                if month_num >= 4:
                    month_idx = month_num - 4
                else:
                    month_idx = month_num + 8
                
                # Allow negative delay values (early submissions)
                esi_data[month_idx].append(DelayedSubmission(delay_days=delay_days))

    return DelayedData(
        labels=month_labels,
        datasets={
            "PF": pf_data,
            "ESI": esi_data
        }
    )

async def get_all_years(current_user: UserModel, db: Session) -> Years:
    """Get all available financial years"""
    # Get all remittance dates from both tables
    pf_query = db.query(ProcessedFilePF.remittance_date).filter(
        ProcessedFilePF.remittance_date.isnot(None)
    )
    esi_query = db.query(ProcessedFileESI.remittance_date).filter(
        ProcessedFileESI.remittance_date.isnot(None)
    )
    
    if current_user.role != "admin":
        pf_query = pf_query.filter(ProcessedFilePF.user_id == current_user.id)
        esi_query = esi_query.filter(ProcessedFileESI.user_id == current_user.id)
    
    pf_results = pf_query.all()
    esi_results = esi_query.all()
    print(pf_results,esi_results)
    
    years_set = set()
    print(years_set)
    
    # Process PF dates
    # for result in pf_results:
    #     if result.remittance_date:
    #         rem_date = parse_date_string(result.remittance_date)
    #         if rem_date:
    #             # Financial year logic: if month >= 4, FY is current year + 1
    #             if rem_date.month >= 4:
    #                 fy_year = rem_date.year + 1
    #             else:
    #                 fy_year = rem_date.year
    #             years_set.add(fy_year)
    for (remittance_date,) in pf_results:
        print("Raw PF date from DB:", remittance_date)
        if remittance_date:
            rem_date = parse_db_date(remittance_date)
            print("Parsed PF date:", rem_date)
            if rem_date:
                fy_year = rem_date.year + 1 if rem_date.month >= 4 else rem_date.year
                years_set.add(fy_year)
    
    # Process ESI dates
    # for result in esi_results:
    #     if result.remittance_date:
    #         rem_date = parse_date_string(result.remittance_date)
    #         if rem_date:
    #             # Financial year logic
    #             if rem_date.month >= 4:
    #                 fy_year = rem_date.year + 1
    #             else:
    #                 fy_year = rem_date.year
    #             years_set.add(fy_year)
    for (remittance_date,) in esi_results:
        print("Raw PF date from DB:", remittance_date)
        if remittance_date:
            rem_date = parse_db_date(remittance_date)
            if rem_date:
                fy_year = rem_date.year + 1 if rem_date.month >= 4 else rem_date.year
                years_set.add(fy_year)

    print(years_set)
    list_of_years = sorted(list(years_set))
    print(list_of_years)
    return Years(yearlist=list_of_years)

# async def get_delayed_submissions_chart_data(db: Session, year: int, current_user: UserModel) -> Dict:
#     """Get delayed submissions chart data for financial year - allows negative delay values"""
#     start_date, end_date = get_financial_year_dates(year)
    
#     month_labels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", 
#                    "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
    
#     pf_data = [[] for _ in range(12)]
#     esi_data = [[] for _ in range(12)]

#     # Process PF records - Fixed boolean comparison
#     pf_query = db.query(
#         ProcessedFilePF.upload_month,
#         ProcessedFilePF.remittance_date,
#         ProcessedFilePF.created_at
#     ).filter(
#         ProcessedFilePF.remittance_submitted == True,
#         ProcessedFilePF.remittance_date.isnot(None)
#     )
#     pf_query = apply_user_filter(pf_query, ProcessedFilePF, current_user)
#     print(pf_query)
#     for upload_month, remittance_date, created_at in pf_query.all():
#         if remittance_date:
#             rem_date = parse_date_string(remittance_date)
            
#             if rem_date and start_date <= rem_date <= end_date:
#                 # Calculate delay based on upload month if available
#                 if upload_month:
#                     upload_date = parse_date_string(f"15-{upload_month}", "DD-MM-YYYY")
#                     if upload_date:
#                         delay_days = (rem_date - upload_date).days
#                     else:
#                         delay_days = (rem_date - created_at.date()).days if created_at else 0
#                 else:
#                     delay_days = (rem_date - created_at.date()).days if created_at else 0
                
#                 month_num = rem_date.month
                
#                 # Map to financial year index
#                 if month_num >= 4:
#                     month_idx = month_num - 4
#                 else:
#                     month_idx = month_num + 8
                
#                 # Allow negative delay values (early submissions)
#                 pf_data[month_idx].append({"delay_days": delay_days})
#                 print(delay_days)

#     # Process ESI records - Fixed boolean comparison
#     esi_query = db.query(
#         ProcessedFileESI.upload_month,
#         ProcessedFileESI.remittance_date,
#         ProcessedFileESI.created_at
#     ).filter(
#         ProcessedFileESI.remittance_submitted == True,
#         ProcessedFileESI.remittance_date.isnot(None)
#     )
#     esi_query = apply_user_filter(esi_query, ProcessedFileESI, current_user)
#     print(esi_query)
#     for upload_month, remittance_date, created_at in esi_query.all():
#         if remittance_date:
#             rem_date = parse_date_string(remittance_date)
            
#             if rem_date and start_date <= rem_date <= end_date:
#                 # Calculate delay based on upload month if available
#                 if upload_month:
#                     upload_date = parse_date_string(f"15-{upload_month}", "DD-MM-YYYY")
#                     if upload_date:
#                         delay_days = (rem_date - upload_date).days
#                     else:
#                         delay_days = (rem_date - created_at.date()).days if created_at else 0
#                 else:
#                     delay_days = (rem_date - created_at.date()).days if created_at else 0
                
#                 month_num = rem_date.month
                
#                 # Map to financial year index
#                 if month_num >= 4:
#                     month_idx = month_num - 4
#                 else:
#                     month_idx = month_num + 8
                
#                 # Allow negative delay values (early submissions)
#                 esi_data[month_idx].append({"delay_days": delay_days})
#                 print(delay_days)

#     return {
#         "labels": month_labels,
#         "datasets": {
#             "PF": pf_data,
#             "ESI": esi_data
#         }
#     }
async def get_delayed_submissions_chart_data(db: Session, year: int, current_user: UserModel) -> Dict:
    """Get delayed submissions chart data for financial year - allows negative delay values"""
    start_date, end_date = get_financial_year_dates(year)
    month_labels = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", 
                    "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]

    pf_data = process_remittance_data(
        db.query(ProcessedFilePF.upload_month, ProcessedFilePF.remittance_date, ProcessedFilePF.created_at),
        current_user,
        ProcessedFilePF,
        (start_date, end_date),
        "PF"
    )

    esi_data = process_remittance_data(
        db.query(ProcessedFileESI.upload_month, ProcessedFileESI.remittance_date, ProcessedFileESI.created_at),
        current_user,
        ProcessedFileESI,
        (start_date, end_date),
        "ESI"
    )

    return {
        "labels": month_labels,
        "datasets": {
            "PF": pf_data,
            "ESI": esi_data
        }
    }
# Fixed function to handle the dashboard endpoint that was causing the to_date error
async def get_avg_remittance_day_by_year(db: Session, year: int, current_user: UserModel) -> Dict:
    """Get average remittance day by year - Fixed SQL Server compatibility"""
    
    # Fetch all non-null remittance dates for PF using Python filtering
    pf_query = db.query(
        ProcessedFilePF.remittance_month,
        ProcessedFilePF.remittance_date
    ).filter(
        ProcessedFilePF.remittance_date.isnot(None)
    )
    pf_query = apply_user_filter(pf_query, ProcessedFilePF, current_user)
    pf_rows = pf_query.all()

    # Fetch all non-null remittance dates for ESI using Python filtering
    esi_query = db.query(
        ProcessedFileESI.remittance_month,
        ProcessedFileESI.remittance_date
    ).filter(
        ProcessedFileESI.remittance_date.isnot(None)
    )
    esi_query = apply_user_filter(esi_query, ProcessedFileESI, current_user)
    esi_rows = esi_query.all()

    # def calculate_avg_day(rows):
    #     month_days = {}
    #     for month, date_str in rows:
    #         if date_str:
    #             rem_date = parse_db_date(date_str)
    #             if rem_date and rem_date.year == year:
    #                 month_key = month or f"{rem_date.month:02d}-{rem_date.year}"
    #                 if month_key not in month_days:
    #                     month_days[month_key] = []
    #                 month_days[month_key].append(rem_date.day)

    #     return [
    #         {
    #             "month": datetime.strptime(month, "%m-%Y").strftime("%B") if "-" in month else month,
    #             "day": round(sum(days) / len(days)) if days else 0,
    #         }
    #         for month, days in month_days.items()
    #     ]
    def calculate_avg_day(rows):
        month_days = {}
        for month, date_obj in rows:
            if date_obj:
                rem_date = parse_db_date(date_obj)
                if rem_date and rem_date.year == year:
                    # Handle different types of `month`
                    if isinstance(month, str):
                        month_key = month
                    elif isinstance(month, (datetime, date)):
                        month_key = f"{month.month:02d}-{month.year}"
                    else:
                        continue  # skip unrecognized type

                    if month_key not in month_days:
                        month_days[month_key] = []
                    month_days[month_key].append(rem_date.day)

        return [
        {
            "month": datetime.strptime(month_key, "%m-%Y").strftime("%B"),
            "day": round(sum(days) / len(days)) if days else 0,
        }
        for month_key, days in month_days.items()
    ]


    return {"pf": calculate_avg_day(pf_rows), "esi": calculate_avg_day(esi_rows)}