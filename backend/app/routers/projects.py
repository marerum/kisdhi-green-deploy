"""
Project management API endpoints for AI Business Flow application.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging

from ..database import get_db
from ..models import Project
from ..schemas import ProjectCreate, ProjectUpdate, ProjectResponse
from ..exceptions import ResourceNotFoundError, DatabaseError, ValidationError
from ..utils.error_handlers import handle_database_errors

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("/", response_model=List[ProjectResponse])
@handle_database_errors("list projects")
async def list_projects(db: Session = Depends(get_db)):
    """
    List all projects.
    Returns projects ordered by most recently updated first.
    """
    projects = db.query(Project).order_by(Project.updated_at.desc()).all()
    logger.info(f"Retrieved {len(projects)} projects")
    return projects


@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
@handle_database_errors("create project")
async def create_project(project_data: ProjectCreate, db: Session = Depends(get_db)):
    """
    Create a new project.
    Project is created with draft status by default.
    """
    # Validate input
    if not project_data.name or not project_data.name.strip():
        raise ValidationError("Project name cannot be empty", "name")
    
    if len(project_data.name.strip()) > 255:
        raise ValidationError("Project name cannot exceed 255 characters", "name")
    
    # Create new project instance
    db_project = Project(
        name=project_data.name.strip(),
        department=project_data.department.strip() if project_data.department else None,
        status="draft"
    )
    
    # Add to database
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    logger.info(f"Created project: {db_project.id} - {db_project.name}")
    return db_project


@router.get("/{project_id}", response_model=ProjectResponse)
@handle_database_errors("get project")
async def get_project(project_id: int, db: Session = Depends(get_db)):
    """
    Get a specific project by ID.
    """
    if project_id <= 0:
        raise ValidationError("Project ID must be a positive integer", "project_id")
    
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise ResourceNotFoundError("Project", project_id)
    
    logger.info(f"Retrieved project: {project.id} - {project.name}")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
@handle_database_errors("update project")
async def update_project(
    project_id: int, 
    project_data: ProjectUpdate, 
    db: Session = Depends(get_db)
):
    """
    Update an existing project.
    Only provided fields will be updated.
    """
    if project_id <= 0:
        raise ValidationError("Project ID must be a positive integer", "project_id")
    
    # Get existing project
    project = db.query(Project).filter(Project.id == project_id).first()
    
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
    
    logger.info(f"Updated project: {project.id} - {project.name}")
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
@handle_database_errors("delete project")
async def delete_project(project_id: int, db: Session = Depends(get_db)):
    """
    Delete a project and all associated data.
    This will cascade delete hearing logs and flow nodes.
    """
    if project_id <= 0:
        raise ValidationError("Project ID must be a positive integer", "project_id")
    
    # Get existing project
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise ResourceNotFoundError("Project", project_id)
    
    project_name = project.name  # Store for logging
    
    # Delete project (cascades to hearing logs and flow nodes)
    db.delete(project)
    db.commit()
    
    logger.info(f"Deleted project: {project_id} - {project_name}")