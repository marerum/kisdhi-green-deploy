"""
Project management API endpoints for AI Business Flow application.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from ..database import get_db
from ..models import Project, User
from ..schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from ..exceptions import ResourceNotFoundError, DatabaseError, ValidationError
from ..utils.error_handlers import handle_database_errors

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/projects", tags=["projects"])


async def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current user from X-User-ID header.
    """
    if not x_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-User-ID header is required"
        )
    
    user = db.query(User).filter(User.user_id == x_user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID"
        )
    
    return user


@router.get("/", response_model=List[ProjectResponse])
@handle_database_errors("list projects")
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all projects for the current user.
    Returns projects ordered by most recently updated first.
    """
    projects = db.query(Project).filter(
        Project.user_id == current_user.id
    ).order_by(Project.updated_at.desc()).all()
    
    logger.info(f"Retrieved {len(projects)} projects for user {current_user.user_id}")
    return projects


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
@handle_database_errors("create project")
async def create_project(
    project_data: ProjectCreate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new project for the current user.
    Project is created with draft status by default.
    """
    # Validate input
    if not project_data.name or not project_data.name.strip():
        raise ValidationError("Project name cannot be empty", "name")
    
    if len(project_data.name.strip()) > 255:
        raise ValidationError("Project name cannot exceed 255 characters", "name")
    
    # Create new project instance
    db_project = Project(
        user_id=current_user.id,
        name=project_data.name.strip(),
        department=project_data.department.strip() if project_data.department else None,
        status="draft"
    )
    
    # Add to database
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    logger.info(f"Created project: {db_project.id} - {db_project.name} for user {current_user.user_id}")
    return db_project


@router.get("/{project_id}", response_model=ProjectResponse)
@handle_database_errors("get project")
async def get_project(
    project_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific project by ID (only if owned by current user).
    """
    if project_id <= 0:
        raise ValidationError("Project ID must be a positive integer", "project_id")
    
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise ResourceNotFoundError("Project", project_id)
    
    logger.info(f"Retrieved project: {project.id} - {project.name} for user {current_user.user_id}")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
@handle_database_errors("update project")
async def update_project(
    project_id: int, 
    project_data: ProjectUpdate, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update an existing project (only if owned by current user).
    Only provided fields will be updated.
    """
    if project_id <= 0:
        raise ValidationError("Project ID must be a positive integer", "project_id")
    
    # Get existing project
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise ResourceNotFoundError("Project", project_id)
    
    # Validate update data
    update_data = project_data.model_dump(exclude_unset=True)
    
    if "name" in update_data:
        if not update_data["name"] or not update_data["name"].strip():
            raise ValidationError("Project name cannot be empty", "name")
        if len(update_data["name"].strip()) > 255:
            raise ValidationError("Project name cannot exceed 255 characters", "name")
        update_data["name"] = update_data["name"].strip()
    
    if "department" in update_data and update_data["department"]:
        update_data["department"] = update_data["department"].strip()
    
    # Update fields that were provided
    for field, value in update_data.items():
        setattr(project, field, value)
    
    # Commit changes
    db.commit()
    db.refresh(project)
    
    logger.info(f"Updated project: {project.id} - {project.name} for user {current_user.user_id}")
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
@handle_database_errors("delete project")
async def delete_project(
    project_id: int, 
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a project and all associated data (only if owned by current user).
    This will cascade delete hearing logs and flow nodes.
    """
    if project_id <= 0:
        raise ValidationError("Project ID must be a positive integer", "project_id")
    
    # Get existing project
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user.id
    ).first()
    
    if not project:
        raise ResourceNotFoundError("Project", project_id)
    
    project_name = project.name  # Store for logging
    
    # Delete project (cascades to hearing logs and flow nodes)
    db.delete(project)
    db.commit()
    
    logger.info(f"Deleted project: {project_id} - {project_name} for user {current_user.user_id}")