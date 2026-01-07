"""Terminal session models."""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class SessionStatus(str, Enum):
    """Status of a terminal session."""

    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"


class TerminalSessionCreate(BaseModel):
    """Request model for creating a terminal session."""

    workspace_id: str = Field(..., description="Workspace to connect to")
    shell: Optional[str] = Field(None, description="Shell to use (default: /bin/bash)")
    cols: Optional[int] = Field(None, ge=10, le=500, description="Terminal columns")
    rows: Optional[int] = Field(None, ge=5, le=200, description="Terminal rows")
    working_directory: Optional[str] = Field(None, description="Initial working directory")
    env_vars: dict[str, str] = Field(default_factory=dict, description="Additional env vars")


class TerminalSession(BaseModel):
    """Terminal session model."""

    id: str = Field(..., description="Unique session identifier")
    workspace_id: str = Field(..., description="Associated workspace ID")
    status: SessionStatus = Field(..., description="Current session status")
    
    # Terminal settings
    shell: str = Field(default="/bin/bash")
    cols: int = Field(default=120)
    rows: int = Field(default=40)
    working_directory: Optional[str] = None
    
    # Connection info
    websocket_url: Optional[str] = None
    
    # Session metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity_at: datetime = Field(default_factory=datetime.utcnow)
    
    # AI context
    ai_context_enabled: bool = False
    ai_conversation_id: Optional[str] = None

    class Config:
        from_attributes = True


class TerminalResize(BaseModel):
    """Request model for resizing a terminal."""

    cols: int = Field(..., ge=10, le=500, description="New terminal columns")
    rows: int = Field(..., ge=5, le=200, description="New terminal rows")


class TerminalInput(BaseModel):
    """Model for terminal input data."""

    data: str = Field(..., description="Input data to send to terminal")


class TerminalOutput(BaseModel):
    """Model for terminal output data."""

    data: str = Field(..., description="Output data from terminal")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
