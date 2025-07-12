from sqlalchemy import (
    Column,
    Float,
    Integer,
    String,
    Boolean,
    DateTime,
    Date,
    Text,
    ForeignKey,
    LargeBinary,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from passlib.context import CryptContext
from .base import Base  # assuming you defined `Base = declarative_base()` in db.py


class UserModel(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False, unique=True)
    hashed_password = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    full_name = Column(String)
    role = Column(String, default="USER")
    disabled = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    processed_files_pf = relationship("ProcessedFilePF", back_populates="user")
    processed_files_esi = relationship("ProcessedFileESI", back_populates="user")


class ProcessedFilePF(Base):
    __tablename__ = "processed_files_pf"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String)
    filepath = Column(String)
    file_blob = Column(LargeBinary)
    status = Column(String)
    message = Column(Text)
    upload_date = Column(Date)
    upload_month = Column(Date)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    remittance_submitted = Column(Boolean, default=False)
    remittance_date = Column(Date)
    remittance_month = Column(Date)
    remittance_amount = Column(Float)
    remittance_challan_path = Column(String)
    source_folder = Column(String)
    processed_files_count = Column(Integer)
    success_files_count = Column(Integer)

    user = relationship("UserModel", back_populates="processed_files_pf")


class ProcessedFileESI(Base):
    __tablename__ = "processed_files_esi"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    filename = Column(String, nullable=True)
    filepath = Column(String, nullable=True)
    file_blob = Column(LargeBinary, nullable=True)
    status = Column(String, nullable=True)
    message = Column(Text, nullable=True)
    upload_date = Column(Date, nullable=True)
    upload_month = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=True)
    updated_at = Column(DateTime, onupdate=func.now(), nullable=True)
    remittance_submitted = Column(Boolean, default=False, nullable=False)
    remittance_date = Column(Date, nullable=True)
    remittance_month = Column(Date, nullable=True)
    remittance_amount = Column(Float, nullable=True)
    remittance_challan_path = Column(String, nullable=True)
    source_folder = Column(String, nullable=True)
    processed_files_count = Column(Integer, nullable=True)
    success_files_count = Column(Integer, nullable=True)

    user = relationship("UserModel", back_populates="processed_files_esi")


# Password encryption context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
