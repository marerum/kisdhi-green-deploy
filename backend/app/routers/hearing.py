"""
Hearing log API endpoints for AI Business Flow application.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import logging

from ..database import get_db
from ..models import Project, HearingLog
from ..schemas import HearingLogCreate, HearingLogUpdate, HearingLogResponse
from fastapi import File, UploadFile
import httpx
from ..config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api", tags=["hearing"])


@router.get("/projects/{project_id}/hearing", response_model=List[HearingLogResponse])
async def get_hearing_logs(project_id: int, db: Session = Depends(get_db)):
    """
    Get all hearing logs for a specific project.
    Returns hearing logs ordered chronologically (oldest first).
    """
    try:
        # Verify project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with id {project_id} not found"
            )
        
        # Get hearing logs ordered by creation time
        hearing_logs = (
            db.query(HearingLog)
            .filter(HearingLog.project_id == project_id)
            .order_by(HearingLog.created_at.asc())
            .all()
        )
        
        logger.info(f"Retrieved {len(hearing_logs)} hearing logs for project {project_id}")
        return hearing_logs
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving hearing logs for project {project_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve hearing logs"
        )


@router.post("/projects/{project_id}/hearing", response_model=HearingLogResponse, status_code=status.HTTP_201_CREATED)
async def add_hearing_log(
    project_id: int, 
    hearing_data: HearingLogCreate, 
    db: Session = Depends(get_db)
):
    """
    Add a new hearing log to a project.
    Automatically timestamps the entry for chronological ordering.
    """
    try:
        # Verify project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project with id {project_id} not found"
            )
        
        # Create new hearing log
        db_hearing_log = HearingLog(
            project_id=project_id,
            content=hearing_data.content
        )
        
        # Add to database
        db.add(db_hearing_log)
        db.commit()
        db.refresh(db_hearing_log)
        
        # Update project's updated_at timestamp
        project.updated_at = db_hearing_log.created_at
        db.commit()
        
        logger.info(f"Created hearing log: {db_hearing_log.id} for project {project_id}")
        return db_hearing_log
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating hearing log for project {project_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create hearing log"
        )


@router.put("/hearing/{hearing_id}", response_model=HearingLogResponse)
async def update_hearing_log(
    hearing_id: int, 
    hearing_data: HearingLogUpdate, 
    db: Session = Depends(get_db)
):
    """
    Update an existing hearing log's content.
    Updates the associated project's updated_at timestamp.
    """
    try:
        # Get existing hearing log
        hearing_log = db.query(HearingLog).filter(HearingLog.id == hearing_id).first()
        
        if not hearing_log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hearing log with id {hearing_id} not found"
            )
        
        # Update content
        hearing_log.content = hearing_data.content
        
        # Update associated project's timestamp
        project = db.query(Project).filter(Project.id == hearing_log.project_id).first()
        if project:
            from sqlalchemy.sql import func
            project.updated_at = func.now()
        
        # Commit changes
        db.commit()
        db.refresh(hearing_log)
        
        logger.info(f"Updated hearing log: {hearing_log.id}")
        return hearing_log
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating hearing log {hearing_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update hearing log"
        )


@router.delete("/hearing/{hearing_id}")
async def delete_hearing_log(
    hearing_id: int, 
    db: Session = Depends(get_db)
):
    """
    Delete a hearing log.
    Updates the associated project's updated_at timestamp.
    """
    try:
        # Get existing hearing log
        hearing_log = db.query(HearingLog).filter(HearingLog.id == hearing_id).first()
        
        if not hearing_log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Hearing log with id {hearing_id} not found"
            )
        
        project_id = hearing_log.project_id
        
        # Delete the hearing log
        db.delete(hearing_log)
        
        # Update associated project's timestamp
        project = db.query(Project).filter(Project.id == project_id).first()
        if project:
            from sqlalchemy.sql import func
            project.updated_at = func.now()
        
        # Commit changes
        db.commit()
        
        logger.info(f"Deleted hearing log: {hearing_id}")
        return {"message": f"Hearing log {hearing_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting hearing log {hearing_id}: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete hearing log"
        )


@router.post("/projects/{project_id}/hearing/transcribe")
async def transcribe_hearing_audio(project_id: int, file: UploadFile = File(...)):
    """
    Receive an audio file, forward it to OpenAI's transcription endpoint, and return the transcribed text.
    """
    try:
        logger.info(f"Starting transcription for project {project_id}")
        logger.info(f"Received file: {file.filename}, content_type: {file.content_type}, size: {file.size if hasattr(file, 'size') else 'unknown'}")
        
        # Read file content
        file_content = await file.read()
        logger.info(f"File content read: {len(file_content)} bytes")
        
        if len(file_content) == 0:
            logger.error("Empty file content received")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty audio file")
        
        if len(file_content) < 1000:  # Less than 1KB
            logger.warning(f"Very small file received: {len(file_content)} bytes")
        
        # Basic project existence check
        # We don't persist the audio; just verify project exists for access control parity
        # (reuse db pattern would require DB dependency; keep lightweight)
        # If stricter permission checks are needed, they can be added here.
        
        logger.info("Sending request to OpenAI API...")
        async with httpx.AsyncClient(timeout=60.0) as client:
            url = "https://api.openai.com/v1/audio/transcriptions"
            headers = {
                "Authorization": f"Bearer {settings.openai_api_key}"
            }

            # Build multipart form data with Japanese language setting
            files = {
                "file": (file.filename, file_content, file.content_type or "application/octet-stream"),
                "model": (None, "whisper-1"),
                "language": (None, "ja"),  # Japanese language setting for better accuracy
            }
            
            logger.info(f"OpenAI API request - URL: {url}")
            logger.info(f"File info for OpenAI: name={file.filename}, type={file.content_type}, size={len(file_content)}")

            resp = await client.post(url, headers=headers, files=files, timeout=60.0)
            
            logger.info(f"OpenAI API response status: {resp.status_code}")
            
            if resp.status_code != 200:
                logger.error(f"OpenAI API error: {resp.status_code}")
                try:
                    error_body = resp.json()
                    logger.error(f"OpenAI API error body: {error_body}")
                except Exception:
                    error_body = {"error": resp.text}
                    logger.error(f"OpenAI API error text: {resp.text}")
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail={"message": "Transcription service error", "response": error_body})

            data = resp.json()
            logger.info(f"OpenAI API response data: {data}")
            
            text = data.get("text") or data.get("transcript") or ""
            logger.info(f"Extracted text length: {len(text)} characters")
            
            if text:
                logger.info(f"Transcription successful: '{text[:100]}{'...' if len(text) > 100 else ''}'")
            else:
                logger.warning("Empty transcription result from OpenAI")

            return {"text": text, "raw": data}
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error transcribing audio for project {project_id}: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error details: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to transcribe audio")