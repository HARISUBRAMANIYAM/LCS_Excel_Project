import pandas as pd
import math
import uuid
import filetype
from pathlib import Path
from datetime import datetime
from typing import List, Dict

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from database.models import ProcessedFileESI, UserModel
from schemas.response import FileProcessResult
from utlis.files_utils import sanitize_folder_name

async def process_esi_files(
    files: List[UploadFile],
    folder_name: str,
    upload_month: str,
    current_user: UserModel,
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

    allowed_extensions = (".xls", ".xlsx")
    excel_files = [file for file in files if file.filename.lower().endswith(allowed_extensions)]
    if not excel_files:
        raise HTTPException(status_code=400, detail="No Excel files found in the upload")

    timestamp_folder = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = Path("processed_esi") / upload_month / timestamp_folder
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
                df = pd.read_excel(excel_file.file, engine="openpyxl", dtype={"ESI N0": str, "ESI": str, "ESI Number": str})
            elif kind and kind.extension == "xls":
                df = pd.read_excel(excel_file.file, engine="xlrd", dtype={"ESI N0": str, "ESI": str, "ESI Number": str})
            else:
                raise ValueError("Unsupported or unrecognized Excel file format")

            if df.empty:
                raise ValueError("Excel file is empty")

            required_columns = {
                "ESI No": ["ESI N0","ESI","ESI Number"],
                "Employee Name": ["Employee Name","Name"],
                "ESI Gross": ["ESI Gross","ESI SALARY"],
                "Worked Days": ["Worked days","PD+EL","Pay Days"],
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

            esi_column = df[column_mapping["ESI No"]]
            esi_column_gross = df[column_mapping["ESI Gross"]]

            valid_esi_mask = ~(
                (esi_column == 0)
                | (esi_column == "0")
                | (esi_column == "0.0")
                | (esi_column.isna())
                | (esi_column.isnull())
                | (esi_column == "")
            )

            valid_esi_gross_mask = ~(
                (esi_column_gross == 0)
                | (esi_column_gross.isna())
                | (esi_column_gross.isnull())
            )

            valid_rows_mask = valid_esi_mask & valid_esi_gross_mask
            df = df[valid_rows_mask]

            def custom_round(x):
                if pd.isna(x):
                    return 0
                decimal_part = x - int(x)
                if decimal_part >= 0.5:
                    return math.ceil(x)
                else:
                    return math.floor(x)

            esi_no = df[column_mapping["ESI No"]].astype(str).str.replace("-", "")
            member_name = df[column_mapping["Employee Name"]]
            esi_gross = df[column_mapping["ESI Gross"]].fillna(0).round().astype(int)
            worked_days_raw = df[column_mapping["Worked Days"]]
            worked_days = worked_days_raw.apply(custom_round)

            output_df = pd.DataFrame({
                "ESI No": esi_no,
                "MEMBER NAME": member_name,
                "ESI GROSS": esi_gross,
                "WORKED DAYS": worked_days,
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
                combined_df.to_excel(writer, index=False, sheet_name="ESI Data")
                workbook = writer.book
                worksheet = writer.sheets["ESI Data"]
                number_format = "0"
                numeric_columns = ["C", "D"]
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

    db_record = ProcessedFileESI(
        user_id=current_user.id,
        filename=excel_filename,
        filepath=f"{str(excel_file_path)},{str(text_file_path)}",
        status=overall_status,
        message=overall_message,
        upload_month=first_day_of_month,
        upload_date=first_day_of_month,
        source_folder=folder_name,
        processed_files_count=len(excel_files),
        success_files_count=len([f for f in processed_files if f["status"] == "success"]),
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

def build_esi_response(file: ProcessedFileESI) -> Dict:
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