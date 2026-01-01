"""
Authentication router for simple user ID based authentication.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserLogin, UserResponse

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=UserResponse)
async def login(user_login: UserLogin, db: Session = Depends(get_db)):
    """
    Simple login endpoint - creates user if doesn't exist, returns user info if exists.
    No password required for simplicity.
    """
    # Check if user exists
    user = db.query(User).filter(User.user_id == user_login.user_id).first()
    
    if not user:
        # Create new user if doesn't exist
        user = User(
            user_id=user_login.user_id,
            display_name=user_login.user_id  # Use user_id as display name by default
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return user


@router.post("/register", response_model=UserResponse)
async def register(user_create: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user with optional display name.
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.user_id == user_create.user_id).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID already exists"
        )
    
    # Create new user
    user = User(
        user_id=user_create.user_id,
        display_name=user_create.display_name or user_create.user_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return user


@router.get("/user/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, db: Session = Depends(get_db)):
    """
    Get user information by user ID.
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.get("/validate/{user_id}")
async def validate_user(user_id: str, db: Session = Depends(get_db)):
    """
    Validate if user exists and return basic info.
    """
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"valid": True, "user_id": user.user_id, "display_name": user.display_name}