from fastapi import (
    APIRouter,
    Depends,
    File,
    UploadFile,
    Form,
    HTTPException,
    Query,
    BackgroundTasks,
)
from fastapi.responses import FileResponse, StreamingResponse
from datetime import datetime, timedelta,date
from pathlib import Path
from typing import List, Optional
from io import BytesIO
import zipfile
import pandas as pd
import math
import uuid
import shutil
import filetype

from sqlalchemy.orm import Session
from database.models import ProcessedFileESI, UserModel
from schemas.response import FileProcessResult, ProcessedFileResponse
from services.esi import process_esi_files, build_esi_response
from core.dependencies import get_db, get_current_user, require_hr_or_admin
from utlis.files_utils import sanitize_folder_name

router = APIRouter()


@router.post("/process_folder", response_model=FileProcessResult)
async def process_esi_file(
    files: List[UploadFile] = File(
        ..., description="List of Excel files from the folder"
    ),
    folder_name: str = Form(..., min_length=1, max_length=500),
    upload_month: str = Form(..., description="Date in YYYY-MM-DD format"),
    current_user: UserModel = Depends(require_hr_or_admin),
    db: Session = Depends(get_db),
):
    return await process_esi_files(files, folder_name, upload_month, current_user, db)


@router.get("/processed_files", response_model=List[ProcessedFileResponse])
async def get_processed_files_esi(
    upload_month: str = Query(..., description="Date in YYYY-MM-DD format"),
    current_user: UserModel = Depends(get_current_user),
    user_id: Optional[int] = Query(
        None, description="Specific user ID to filter by (Admin only)"
    ),
    db: Session = Depends(get_db),
):
    try:
        query_date = datetime.strptime(upload_month, "%Y-%m-%d").date()
        first_day_of_month = query_date.replace(day=1)
        last_day_of_month = (first_day_of_month + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid month format. Please use MM-YYYY format (e.g., 05-2023)",
        )

    query = db.query(ProcessedFileESI).filter(
        ProcessedFileESI.upload_date >= first_day_of_month,
        ProcessedFileESI.upload_date <= last_day_of_month,
    )

    if current_user.role != "admin":
        query = query.filter(ProcessedFileESI.user_id == current_user.id)
    elif user_id is not None:
        query = query.filter(ProcessedFileESI.user_id == user_id)

    files = query.order_by(ProcessedFileESI.created_at.desc()).all()
    processed_results = []
    seen_folders = set()

    for file in files:
        if file.status == "success":
            try:
                filepaths = file.filepath.split(",")
                if len(filepaths) == 2:
                    excel_path = Path(filepaths[0])
                    timestamp_folder = excel_path.parent.name

                    if timestamp_folder in seen_folders:
                        continue

                    seen_folders.add(timestamp_folder)
                    text_path = Path(filepaths[1])

                    if not excel_path.exists() or not text_path.exists():
                        file.status = "error"
                        file.message = "Output files not found on server"
                        db.add(file)
                        continue

                    processed_results.append(file)
                else:
                    file.status = "error"
                    file.message = "Invalid file path format in database"
                    db.add(file)
            except Exception:
                file.status = "error"
                file.message = "Error processing file path"
                db.add(file)
                processed_results.append(file)
        else:
            processed_results.append(file)

    try:
        db.commit()
    except Exception:
        db.rollback()

    if current_user.role != "admin" or user_id is not None:
        return [build_esi_response(file) for file in processed_results]

    user_latest = {}
    for file in processed_results:
        if (
            file.user_id not in user_latest
            or file.created_at > user_latest[file.user_id].created_at
        ):
            user_latest[file.user_id] = file

    return [build_esi_response(file) for file in user_latest.values()]


@router.post("/processed_files/{file_id}/submit_remittance")
async def submit_remittance(
    file_id: int,
    remittance_date: str = Form(..., description="Enter the date for the Remittance in YYYY-MM-DD format"), 
    remittance_amount: float = Form(..., description="Total remittance amount"),
    remittance_file: UploadFile = File(...),
    current_user: UserModel = Depends(require_hr_or_admin),
    db: Session = Depends(get_db),
):  
    try:
        parsed_date = datetime.strptime(remittance_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Please use YYYY-MM-DD format (e.g., 2023-05-01)",
        )
    if not remittance_file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    if remittance_amount <= 0:
        raise HTTPException(
            status_code=400, detail="Remittance amount must be positive"
        )

    file = db.query(ProcessedFileESI).filter(ProcessedFileESI.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if not file.upload_month:
        raise HTTPException(
            status_code=400, detail="File missing upload month information"
        )
    upload_month_str = file.upload_month.strftime("%Y-%m-%d") if isinstance(file.upload_month, date) else str(file.upload_month)
    remittance_dir = Path("remittance_challans") / upload_month_str
    remittance_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    month_for_filename = file.upload_month.strftime("%Y_%m_%d") if isinstance(file.upload_month, date) else str(file.upload_month).replace('-', '_')
    new_filename = f"ESI_Remittance_{month_for_filename}_{file_id}_{timestamp}.pdf"
    file_path = remittance_dir / new_filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(remittance_file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save remittance file: {str(e)}"
        )

    try:
        file.remittance_submitted = True
        file.remittance_month = file.upload_month
        file.remittance_date = parsed_date
        file.remittance_amount = remittance_amount
        file.remittance_challan_path = str(file_path)
        file.remittance_submitted_at = datetime.now()
        file.remittance_submitted_by = current_user.id
        db.commit()
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=500, detail=f"Failed to update database: {str(e)}"
        )

    return {
        "status": "success",
        "message": "Remittance submitted successfully",
        "details": {
            "file_id": file_id,
            "remittance_month": upload_month_str,
            "remittance_date": remittance_date,
            "remittance_amount": remittance_amount,
            "challan_path": str(file_path),
            "submitted_at": datetime.now().isoformat(),
        },
    }

@router.get("/processed_files/{file_id}/remittance_challan")
async def download_remittance_challan(
    file_id:int,
    current_user: UserModel = Depends(require_hr_or_admin),
    db: Session = Depends(get_db),
):
    file = db.query(ProcessedFileESI).filter(ProcessedFileESI.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    if not file.remittance_submitted or not file.remittance_challan_path:
        raise HTTPException(status_code=404, detail="No remittance challan found for this file")
    if current_user.role not in ["hr","admin"] and file.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You don't have permission to access this remittance challan")
    challan_path = Path(file.remittance_challan_path)
    if not challan_path.exists():
        raise HTTPException(status_code=404, detail="Remittance file not found on server")
    upload_month_str = file.upload_month.strftime("%Y_%m_%d") if isinstance(file.upload_month, date) else str(file.upload_month).replace('-', '_')
    filename = f"ESI_Remittance_{upload_month_str}_{file_id}.pdf"
    month_header = file.upload_month.strftime("%Y-%m-%d") if isinstance(file.upload_month, date) else str(file.upload_month) or ""


    return FileResponse(
        str(challan_path),
        filename=filename,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Remittance-Month": month_header,
            "X-Remittance-Amount": str(file.remittance_amount) if file.remittance_amount else "0",
        },
    )





@router.get("/processed_files/{file_id}/download")
async def download_esi_file(
    file_id: int,
    file_type: str = Query(
        None, regex="^(txt|xlsx)$", description="File type to download (txt or xlsx)"
    ),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    file = db.query(ProcessedFileESI).filter(ProcessedFileESI.id == file_id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if current_user.role == "user" and file.user_id != current_user.id:
        raise HTTPException(
            status_code=403, detail="You can only download your own files"
        )

    if file.status != "success":
        raise HTTPException(
            status_code=400,
            detail="File cannot be downloaded as processing was not successful",
        )

    try:
        excel_path, text_path = file.filepath.split(",")
    except ValueError:
        raise HTTPException(
            status_code=500, detail="Invalid file path format in database"
        )
    upload_month_str = file.upload_month.strftime("%Y_%m_%d") if isinstance(file.upload_month, date) else str(file.upload_month).replace('-', '_')
    if file_type and file_type.lower() == "txt":
        file_path = Path(text_path)
        media_type = "text/plain"
        filename = f"ESI_{upload_month_str}_{file_id}.txt"
    else:
        file_path = Path(excel_path)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"ESI_{upload_month_str}_{file_id}.xlsx"

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Requested file not found on server: {file_path.name}",
        )
    month_header = file.upload_month.strftime("%Y-%m-%d") if isinstance(file.upload_month, date) else str(file.upload_month) or ""
    headers = {
        "Content-Disposition": f"attachment; filename={filename}",
        "X-File-Month": month_header
    }

    return FileResponse(
        path=file_path, filename=filename, media_type=media_type, headers=headers
    )


@router.get("/processed_files/batch_download")
async def download_multiple_esi_files(
    file_ids: str = Query(..., description="Comma-separated list of file IDs"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    try:
        file_ids_list = list(
            {int(id.strip()) for id in file_ids.split(",") if id.strip()}
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid file IDs format")

    files = (
        db.query(ProcessedFileESI).filter(ProcessedFileESI.id.in_(file_ids_list)).all()
    )
    if not files:
        raise HTTPException(
            status_code=404, detail="No files found with the provided IDs"
        )

    valid_files = []
    for file in files:
        if current_user.role == "user" and file.user_id != current_user.id:
            continue

        if file.status != "success":
            continue

        try:
            excel_path, text_path = file.filepath.split(",")
            if not Path(excel_path).exists() or not Path(text_path).exists():
                continue
        except (ValueError, AttributeError):
            continue

        valid_files.append(file)

    if not valid_files:
        raise HTTPException(
            status_code=404, detail="No valid files available for download"
        )

    zip_buffer = BytesIO()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    files_added = 0

    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        for file in valid_files:
            try:
                excel_path, text_path = file.filepath.split(",")
                month_folder = file.upload_month.strftime("%Y-%m-%d") if isinstance(file.upload_month, date) else str(file.upload_month) or "unknown_month"
                month_for_filename = file.upload_month.strftime("%Y_%m_%d") if isinstance(file.upload_month, date) else str(file.upload_month).replace('-', '_')
                base_filename = f"ESI_{month_for_filename}_{file.id}"

                zip_dir = f"ESI_Files/{month_folder}"
                zip_file.write(excel_path, f"{zip_dir}/{base_filename}.xlsx")
                files_added += 1
                zip_file.write(text_path, f"{zip_dir}/{base_filename}.txt")
                files_added += 1
            except Exception:
                continue

    if files_added == 0:
        raise HTTPException(status_code=500, detail="Failed to package any files")

    zip_buffer.seek(0)
    try:
        with zipfile.ZipFile(zip_buffer, "r") as test_zip:
            if test_zip.testzip() is not None:
                raise HTTPException(status_code=500, detail="Error creating zip file")
    except:
        raise HTTPException(status_code=500, detail="Error creating zip file")

    zip_buffer.seek(0)

    def cleanup():
        zip_buffer.close()

    background_tasks.add_task(cleanup)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=esi_files_{timestamp}.zip",
            "X-Files-Count": str(files_added),
            "X-Zip-Integrity": "valid",
        },
        background=background_tasks,
    )
