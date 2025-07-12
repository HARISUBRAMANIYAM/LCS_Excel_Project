from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from enum import Enum

class Role(str, Enum):
    ADMIN = "admin"
    HR = "hr"
    USER = "user"

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Role = Role.USER
    disabled: Optional[bool] = False

class UserInDB(UserBase):
    id: int
    role: str
    disabled: bool

    class Config:
        model_config = {
    "from_attributes": True}

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    username: str
    current_password: str
    new_password: str = Field(..., min_length=6)

    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v