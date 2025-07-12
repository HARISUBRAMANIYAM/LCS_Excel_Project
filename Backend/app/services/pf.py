import pandas as pd
import math
import uuid
import filetype
import shutil
import zipfile
from pathlib import Path
from datetime import datetime, timedelta
from io import BytesIO
from typing import List, Dict, Optional

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta
from database.models import ProcessedFilePF, UserModel
from schemas.response import FileProcessResult, ProcessedFileResponse
from utlis.files_utils import sanitize_folder_name

async def process_pf_files(
    files: List[UploadFile],
    folder_name: str,
    current_user: UserModel,
    upload_month: str,
    db: Session
) -> FileProcessResult:
    fname = sanitize_folder_name(foldername=folder_name)
    try:
        upload_date_obj = datetime.strptime(upload_month, "%Y-%m-%d").date()
        first_day_of_month = upload_date_obj
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Please use YYYY-MM-DD format (e.g., 2023-05-01)",
        )


    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    excel_files = [file for file in files if file.filename.lower().endswith((".xls", ".xlsx"))]
    if not excel_files:
        raise HTTPException(status_code=400, detail="No Excel files found in the upload")

    timestamp_folder = datetime.now().strftime("%Y%m%d_%H%M%S")
    upload_month_str = upload_date_obj.strftime("%Y-%m-%d")
    output_dir = Path("processed_pf") / upload_month_str / timestamp_folder
    output_dir.mkdir(parents=True, exist_ok=True)

    month_for_filename = upload_date_obj.strftime("%Y_%m_%d")
    excel_filename = f"{fname}_{month_for_filename}.xlsx"
    text_filename = f"{fname}_{month_for_filename}.txt"
    excel_file_path = output_dir / excel_filename
    text_file_path = output_dir / text_filename

    combined_df = pd.DataFrame()
    processed_files = []
    overall_status = "success"
    overall_message = "All files processed successfully."

    for excel_file in excel_files:
        try:
            kind = filetype.guess(excel_file.file)
            if kind and kind.extension == "xlsx":
                df = pd.read_excel(excel_file.file, engine="openpyxl", dtype={"UAN No": str, "UAN": str, "UAN Number": str})
            elif kind and kind.extension == "xls":
                df = pd.read_excel(excel_file.file, engine="xlrd", dtype={"UAN No": str, "UAN": str, "UAN Number": str})
            else:
                raise ValueError("Unsupported or unrecognized Excel file format")

            required_columns = {
                "UAN No": ["UAN No","UAN","UAN Number"],
                "Employee Name": ["Employee Name","Name"],
                "Gross Wages": ["Total Salary", "Gross Salary","Total Earnings","T GROSS"],
                "EPF Wages": ["PF Gross", "EPF Gross","EPF WAGES"],
                "LOP Days": ["LOP", "LOP Days","Lop Days"],
            }

            column_mapping = {}
            missing_columns = []
            for field, alternatives in required_columns.items():
                found = False
                for alt in alternatives:
                    if alt in df.columns:
                        column_mapping[field] = alt
                        found = True
                        break
                if not found:
                    missing_columns.append(field)

            if missing_columns:
                raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

            def custom_round(x):
                if pd.isna(x):
                    return 0
                decimal_part = x - int(x)
                if decimal_part >= 0.5:
                    return math.ceil(x)
                else:
                    return math.floor(x)

            uan_no = df[column_mapping["UAN No"]].astype(str).str.replace("-", "")
            member_name = df[column_mapping["Employee Name"]]
            gross_wages = df[column_mapping["Gross Wages"]].fillna(0).round().astype(int)
            epf_wages = df[column_mapping["EPF Wages"]].fillna(0).round().astype(int)
            lop_days_raw = df[column_mapping["LOP Days"]]
            lop_days = lop_days_raw.apply(custom_round)
            eps_wages = epf_wages.apply(lambda x: min(x, 15000) if x > 0 else 0)
            edli_wages = epf_wages.apply(lambda x: min(x, 15000) if x > 0 else 0)
            epf_contrib_remitted = (epf_wages * 0.12).round().astype(int)
            eps_contrib_remitted = (eps_wages * 0.0833).round().astype(int)
            epf_eps_diff_remitted = (epf_contrib_remitted - eps_contrib_remitted).astype(int)
            ncp_days = lop_days
            refund_of_advances = 0

            output_df = pd.DataFrame({
                "UAN No": uan_no,
                "MEMBER NAME": member_name,
                "GROSS WAGES": gross_wages,
                "EPF Wages": epf_wages,
                "EPS Wages": eps_wages,
                "EDLI WAGES": edli_wages,
                "EPF CONTRI REMITTED": epf_contrib_remitted,
                "EPS CONTRI REMITTED": eps_contrib_remitted,
                "EPF EPS DIFF REMITTED": epf_eps_diff_remitted,
                "NCP DAYS": ncp_days,
                "REFUND OF ADVANCES": refund_of_advances,
            })

            combined_df = pd.concat([combined_df, output_df], ignore_index=True)
            combined_df.dropna(inplace=True)
            processed_files.append({
                "filename": excel_file.filename,
                "status": "success",
                "message": "Processed successfully",
            })

        except Exception as e:
            processed_files.append({
                "filename": excel_file.filename,
                "status": "error",
                "message": f"Error processing file: {str(e)}",
            })
            overall_status = "error"
            overall_message = "Some files had errors during processing."

    if not combined_df.empty and len(combined_df) > 0:
        try:
            with pd.ExcelWriter(excel_file_path, engine="openpyxl") as writer:
                combined_df.to_excel(writer, index=False, sheet_name="PF_Data")
                workbook = writer.book
                worksheet = writer.sheets["PF_Data"]
                number_format = "0"
                numeric_columns = ["C", "D", "E", "F", "G", "H", "I", "J"]
                for col in numeric_columns:
                    for cell in worksheet[col][1:]:
                        cell.number_format = number_format
                worksheet.protection.disable()
                for column in worksheet.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    adjusted_width = (max_length + 2) * 1.2
                    worksheet.column_dimensions[column_letter].width = adjusted_width

            output_lines = ["#~#".join(map(str, row)) for row in combined_df.values.tolist()]
            header_line = "#~#".join(combined_df.columns)
            output_lines.insert(0, header_line)

            with open(text_file_path, "w") as f:
                f.write("\n".join(output_lines))
        except Exception as e:
            overall_status = "error"
            overall_message = f"Error saving combined files: {str(e)}"
            try:
                if excel_file_path.exists():
                    excel_file_path.unlink()
                if text_file_path.exists():
                    text_file_path.unlink()
            except:
                pass
    else:
        overall_status = "error"
        overall_message = "No valid data to save after processing"

    db_record = ProcessedFilePF(
        user_id=current_user.id,
        filename=excel_filename,
        filepath=f"{str(excel_file_path)},{str(text_file_path)}",
        status=overall_status,
        message=overall_message,
        upload_month=first_day_of_month,
        upload_date=first_day_of_month,
    )

    try:
        db.add(db_record)
        db.commit()
        db.refresh(db_record)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error saving record to database: {str(e)}")

    return FileProcessResult(
        status=overall_status,
        message=overall_message,
        upload_month=upload_month,
        file_path=str(excel_file_path),
        processed_files=processed_files,
        total_files=len(excel_files),
        successful_files=len([f for f in processed_files if f["status"] == "success"]),
    )

def build_pf_response(file: ProcessedFilePF) -> Dict:
    filepaths = file.filepath.split(",")
    excel_file_url = filepaths[0] if len(filepaths) > 0 else ""
    text_file_url = filepaths[1] if len(filepaths) > 1 else ""

    return {
        "id": file.id,
        "user_id": file.user_id,
        "filename": file.filename,
        "filepath": file.filepath,
        "status": file.status,
        "message": file.message,
        "upload_date": file.upload_date,
        "remittance_submitted": file.remittance_submitted,
        "remittance_date": file.remittance_date,
        "remittance_challan_path": file.remittance_challan_path,
        "remittance_amount": file.remittance_amount,
        "created_at": file.created_at,
        "remittance_month": file.remittance_month,
        "updated_at": file.updated_at,
        "source_folder": file.source_folder,
        "processed_files_count": file.processed_files_count,
        "success_files_count": file.success_files_count,
        "excel_file_url": excel_file_url,
        "text_file_url": text_file_url,
    }