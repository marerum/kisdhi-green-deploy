"""
Pydantic schemas for request/response models in AI Business Flow application.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class ProjectCreate(BaseModel):
    """Schema for creating a new project."""
    name: str = Field(..., min_length=1, max_length=255, description="Project name")
    department: Optional[str] = Field(None, max_length=100, description="Department name")


class ProjectUpdate(BaseModel):
    """Schema for updating an existing project."""
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="Project name")
    department: Optional[str] = Field(None, max_length=100, description="Department name")
    status: Optional[str] = Field(None, max_length=50, description="Project status")


class ProjectResponse(BaseModel):
    """Schema for project response data."""
    id: int
    name: str
    department: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class HearingLogCreate(BaseModel):
    """Schema for creating a new hearing log."""
    content: str = Field(..., min_length=1, description="Hearing log content")


class HearingLogUpdate(BaseModel):
    """Schema for updating an existing hearing log."""
    content: str = Field(..., min_length=1, description="Hearing log content")


class HearingLogResponse(BaseModel):
    """Schema for hearing log response data."""
    id: int
    project_id: int
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class FlowNodeCreate(BaseModel):
    """Schema for creating a new flow node."""
    project_id: int = Field(..., description="Project ID")
    text: str = Field(..., min_length=1, max_length=500, description="Flow node text")
    order: int = Field(..., ge=0, description="Flow node order")


class FlowNodeUpdate(BaseModel):
    """Schema for updating an existing flow node."""
    text: str = Field(..., min_length=1, max_length=500, description="Flow node text")


class FlowNodeResponse(BaseModel):
    """Schema for flow node response data."""
    id: int
    project_id: int
    text: str
    order: int
    actor: Optional[str] = None
    step: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ActorSchema(BaseModel):
    """Schema for actor/role information."""
    name: str = Field(..., description="Actor name")
    role: str = Field(..., description="Actor role description")


class StepSchema(BaseModel):
    """Schema for step information."""
    name: str = Field(..., description="Step name")
    description: str = Field(..., description="Step description")


class FlowGenerationResponse(BaseModel):
    """Schema for complete flow generation response."""
    actors: List[ActorSchema] = Field(..., description="List of actors/roles")
    steps: List[StepSchema] = Field(..., description="List of steps")
    flow_nodes: List[FlowNodeResponse] = Field(..., description="List of flow nodes")


class FlowReorderRequest(BaseModel):
    """Schema for reordering flow nodes."""
    node_orders: List[dict] = Field(
        ..., 
        description="List of node id and order pairs",
        example=[{"id": 1, "order": 0}, {"id": 2, "order": 1}]
    )


class ProjectWithDetails(ProjectResponse):
    """Schema for project with related hearing logs and flow nodes."""
    hearing_logs: List[HearingLogResponse] = []
    flow_nodes: List[FlowNodeResponse] = []

    class Config:
        from_attributes = True