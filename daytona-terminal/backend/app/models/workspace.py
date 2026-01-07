"""Workspace models for Daytona integration."""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class WorkspaceStatus(str, Enum):
    """Status of a Daytona workspace."""

    PENDING = "pending"
    CREATING = "creating"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    STOPPED = "stopped"
    ERROR = "error"
    DELETED = "deleted"


class WorkspaceCreate(BaseModel):
    """Request model for creating a workspace."""

    name: str = Field(..., min_length=1, max_length=100, description="Workspace name")
    repository_url: Optional[str] = Field(None, description="Git repository URL to clone")
    branch: Optional[str] = Field(None, description="Git branch to checkout")
    image: Optional[str] = Field(None, description="Docker image to use")
    env_vars: dict[str, str] = Field(default_factory=dict, description="Environment variables")
    dotfiles_url: Optional[str] = Field(None, description="Dotfiles repository URL")
    ai_assistant: Optional[str] = Field(
        None, description="AI assistant to pre-install (claude, openai)"
    )


class WorkspaceUpdate(BaseModel):
    """Request model for updating a workspace."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    env_vars: Optional[dict[str, str]] = None


class Workspace(BaseModel):
    """Workspace model representing a Daytona workspace."""

    id: str = Field(..., description="Unique workspace identifier")
    name: str = Field(..., description="Workspace name")
    status: WorkspaceStatus = Field(..., description="Current workspace status")
    repository_url: Optional[str] = None
    branch: Optional[str] = None
    image: str = Field(..., description="Docker image used")
    
    # Connection details
    ssh_host: Optional[str] = None
    ssh_port: Optional[int] = None
    ssh_user: Optional[str] = None
    ide_url: Optional[str] = None
    
    # Resource info
    cpu_cores: Optional[int] = None
    memory_gb: Optional[float] = None
    disk_gb: Optional[float] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_accessed_at: Optional[datetime] = None
    owner_id: Optional[str] = None
    
    # AI Assistant
    ai_assistant: Optional[str] = None
    ai_assistant_installed: bool = False
    
    # Additional data
    metadata: dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True


class WorkspaceList(BaseModel):
    """Response model for listing workspaces."""

    workspaces: list[Workspace]
    total: int
    page: int = 1
    per_page: int = 20
