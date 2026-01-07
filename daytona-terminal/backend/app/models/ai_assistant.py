"""AI Assistant models for Claude Code and OpenAI integration."""

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class AIAssistantType(str, Enum):
    """Type of AI assistant."""

    CLAUDE = "claude"
    OPENAI = "openai"
    CUSTOM = "custom"


class AIMessage(BaseModel):
    """A single message in an AI conversation."""

    id: str = Field(..., description="Unique message identifier")
    role: str = Field(..., description="Message role: user, assistant, system")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Tool/function call related
    tool_calls: Optional[list[dict[str, Any]]] = None
    tool_call_id: Optional[str] = None
    
    # Terminal context
    terminal_context: Optional[str] = Field(
        None, description="Terminal output context when message was sent"
    )
    working_directory: Optional[str] = None
    
    # Metadata
    tokens_used: Optional[int] = None
    model: Optional[str] = None


class AIConversation(BaseModel):
    """An AI conversation associated with a terminal session."""

    id: str = Field(..., description="Unique conversation identifier")
    session_id: str = Field(..., description="Associated terminal session ID")
    assistant_type: AIAssistantType = Field(..., description="Type of AI assistant")
    
    messages: list[AIMessage] = Field(default_factory=list)
    
    # Conversation settings
    model: str = Field(default="claude-3-5-sonnet-20241022")
    system_prompt: Optional[str] = None
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: int = Field(default=4096)
    
    # Context
    repository_context: Optional[str] = None
    file_context: list[str] = Field(default_factory=list)
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    total_tokens_used: int = 0


class AIAssistant(BaseModel):
    """AI Assistant configuration."""

    type: AIAssistantType
    name: str
    description: str
    model: str
    installed: bool = False
    installation_command: Optional[str] = None
    
    # Capabilities
    can_execute_commands: bool = True
    can_read_files: bool = True
    can_write_files: bool = True
    can_search_codebase: bool = True
    
    # Configuration
    api_key_env_var: str
    config: dict[str, Any] = Field(default_factory=dict)


class AICommandRequest(BaseModel):
    """Request for AI to execute a command."""

    prompt: str = Field(..., description="User prompt/instruction")
    include_terminal_context: bool = Field(
        default=True, description="Include recent terminal output as context"
    )
    include_file_context: bool = Field(
        default=False, description="Include file contents as context"
    )
    files: list[str] = Field(default_factory=list, description="Files to include as context")
    auto_execute: bool = Field(
        default=False, description="Automatically execute suggested commands"
    )


class AICommandResponse(BaseModel):
    """Response from AI with suggested command or action."""

    message: str = Field(..., description="AI response message")
    suggested_commands: list[str] = Field(
        default_factory=list, description="Suggested shell commands"
    )
    code_blocks: list[dict[str, str]] = Field(
        default_factory=list, description="Code blocks with language and content"
    )
    requires_confirmation: bool = Field(
        default=True, description="Whether commands need user confirmation"
    )
    conversation_id: str = Field(..., description="Conversation ID for follow-ups")
