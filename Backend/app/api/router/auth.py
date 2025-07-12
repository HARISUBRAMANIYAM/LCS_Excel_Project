from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session
from jose import JWTError

from database.models import UserModel
from schemas.auth import UserCreate, ChangePasswordRequest, Token
from schemas.response import UserResponse, MessageResponse
from services.auth import (
    register_new_user,
    authenticate_user,
    change_user_password,
    refresh_user_token
)
from core.dependencies import get_db, get_current_user
from core.config import settings

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register_user(
    user: UserCreate, 
    db: Session = Depends(get_db),
    created_by_admin: bool = False
):
    return await register_new_user(user, db, created_by_admin)

@router.post("/login", response_model=Token)
async def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    return await authenticate_user(form_data, db)

@router.put("/change_password", response_model=MessageResponse)
async def change_password(
    password_data: ChangePasswordRequest,
    db: Session = Depends(get_db)
):
    return await change_user_password(password_data, db)

@router.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: UserModel = Depends(get_current_user)):
    return current_user

@router.get("/users")
async def read_users(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    result = []
    data = db.query(UserModel).all()
    for row in data:
        user = {"id": row.id, "name": row.username}
        result.append(user)
    return result

@router.post("/refresh_token", response_model=Token)
async def refresh_token(
    refresh_data: dict = Body(...),
    db: Session = Depends(get_db)
):
    return await refresh_user_token(refresh_data, db)

@router.post("/logout")
async def logout(current_user: UserModel = Depends(get_current_user)):
    return {"message": "Successfully logged out"}