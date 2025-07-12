from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
from utlis.files_utils import Role


class FileProcessResult(BaseModel):
    status: str
    message: str
    upload_month: str
    file_path: str
    processed_files: List[Dict[str, str]]
    total_files: int
    successful_files: int


class ProcessedFileResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    filepath: str
    status: str
    message: Optional[str]
    upload_date: Optional[datetime]
    remittance_submitted: bool
    remittance_date: Optional[datetime]
    remittance_challan_path: Optional[str]
    remittance_amount: Optional[float]
    created_at: datetime
    remittance_month: Optional[datetime]
    updated_at: Optional[datetime]
    source_folder: Optional[str]
    processed_files_count: Optional[int]
    success_files_count: Optional[int]
    excel_file_url: Optional[str]
    text_file_url: Optional[str]


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    role: Role
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    message: str
