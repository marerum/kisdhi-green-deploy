"""
SQLAlchemy models for AI Business Flow application.
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship, Mapped
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional, List

from .database import Base


class User(Base):
    """
    User model for simple authentication.
    No password required - just user ID based authentication.
    """
    __tablename__ = "users"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = Column(String(100), unique=True, nullable=False, index=True)
    display_name: Mapped[Optional[str]] = Column(String(255), nullable=True)
    created_at: Mapped[datetime] = Column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    projects: Mapped[List["Project"]] = relationship(
        "Project", 
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="Project.created_at.desc()"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, user_id='{self.user_id}', display_name='{self.display_name}')>"


class Project(Base):
    """
    Project model representing a business process analysis project.
    Contains hearing logs and flow nodes.
    """
    __tablename__ = "projects"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = Column(Integer, ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = Column(String(255), nullable=False)
    department: Mapped[Optional[str]] = Column(String(100), nullable=True)
    status: Mapped[str] = Column(String(50), default="draft", nullable=False)
    created_at: Mapped[datetime] = Column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="projects")
    hearing_logs: Mapped[List["HearingLog"]] = relationship(
        "HearingLog", 
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="HearingLog.created_at"
    )
    flow_nodes: Mapped[List["FlowNode"]] = relationship(
        "FlowNode", 
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="FlowNode.order"
    )
    flow_edges: Mapped[List["FlowEdge"]] = relationship(
        "FlowEdge",
        back_populates="project",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name='{self.name}', status='{self.status}', user_id={self.user_id})>"


class HearingLog(Base):
    """
    HearingLog model representing user input from business process interviews.
    Belongs to a Project and is stored with timestamps for chronological ordering.
    """
    __tablename__ = "hearing_logs"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = Column(Integer, ForeignKey("projects.id"), nullable=False)
    content: Mapped[str] = Column(Text, nullable=False)
    created_at: Mapped[datetime] = Column(DateTime, default=func.now(), nullable=False)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="hearing_logs")

    def __repr__(self) -> str:
        content_preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"<HearingLog(id={self.id}, project_id={self.project_id}, content='{content_preview}')>"


class FlowNode(Base):
    """
    FlowNode model representing individual steps in a business process flow diagram.
    Belongs to a Project and has an order for sequencing.
    """
    __tablename__ = "flow_nodes"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = Column(Integer, ForeignKey("projects.id"), nullable=False)
    text: Mapped[str] = Column(String(500), nullable=False)
    order: Mapped[int] = Column(Integer, nullable=False)
    actor: Mapped[Optional[str]] = Column(String(100), nullable=True)
    step: Mapped[Optional[str]] = Column(String(100), nullable=True)
    position_x: Mapped[Optional[float]] = Column(Integer, nullable=True)
    position_y: Mapped[Optional[float]] = Column(Integer, nullable=True)
    created_at: Mapped[datetime] = Column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="flow_nodes")

    def __repr__(self) -> str:
        text_preview = self.text[:50] + "..." if len(self.text) > 50 else self.text
        return f"<FlowNode(id={self.id}, project_id={self.project_id}, order={self.order}, text='{text_preview}')>"


class FlowEdge(Base):
    """
    FlowEdge model representing connections between flow nodes.
    Stores edges using node order numbers for stability across regenerations.
    """
    __tablename__ = "flow_edges"

    id: Mapped[int] = Column(Integer, primary_key=True, index=True)
    project_id: Mapped[int] = Column(Integer, ForeignKey("projects.id"), nullable=False)
    from_node_order: Mapped[int] = Column(Integer, nullable=False)
    to_node_order: Mapped[int] = Column(Integer, nullable=False)
    condition: Mapped[Optional[str]] = Column(Text, nullable=True)
    created_at: Mapped[datetime] = Column(DateTime, default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="flow_edges")

    def __repr__(self) -> str:
        condition_str = f", condition='{self.condition}'" if self.condition else ""
        return f"<FlowEdge(id={self.id}, project_id={self.project_id}, {self.from_node_order}→{self.to_node_order}{condition_str})>"
