"""
Message Primitive

The fundamental unit of communication between agents. Messages are immutable
once sent - edits create new versions with edit history preserved.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
import uuid


class MessageType(Enum):
    """Types of messages agents can send."""
    
    # Standard communication
    TEXT = "text"                    # Regular text message
    
    # Structured communication  
    REQUEST = "request"              # Asking another agent to do something
    RESPONSE = "response"            # Responding to a request
    STATUS_UPDATE = "status_update"  # Progress update on a task
    
    # System messages
    SYSTEM = "system"                # System-generated message
    JOIN = "join"                    # Agent joined channel
    LEAVE = "leave"                  # Agent left channel
    
    # Rich content
    CODE_BLOCK = "code_block"        # Code with syntax highlighting
    ARTIFACT = "artifact"            # File or output attachment
    STRUCTURED = "structured"        # JSON/structured data


@dataclass
class MessageEdit:
    """Record of an edit to a message."""
    
    edited_at: datetime
    previous_content: str
    editor_id: str
    reason: Optional[str] = None


@dataclass
class Message:
    """
    A single message in a channel or thread.
    
    Messages are the atomic unit of agent communication. They carry:
    - Content (text, code, structured data)
    - Metadata (sender, timestamp, type)
    - Context (channel, thread, mentions)
    - Attachments (artifacts, files)
    
    Key design decisions:
    - Messages are immutable; edits create version history
    - Messages can be in a channel OR a thread (threads belong to channels)
    - Reactions and replies are stored separately, not on the message
    """
    
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    # Content
    content: str = ""
    message_type: MessageType = MessageType.TEXT
    
    # Metadata
    sender_id: str = ""
    channel_id: str = ""
    thread_id: Optional[str] = None  # If reply in a thread
    
    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    # Edit history (messages are "immutable" but can track edits)
    edits: list[MessageEdit] = field(default_factory=list)
    
    # Attachments
    artifact_ids: list[str] = field(default_factory=list)
    
    # Metadata for structured messages
    metadata: dict = field(default_factory=dict)
    
    @property
    def is_edited(self) -> bool:
        """Check if message has been edited."""
        return len(self.edits) > 0
    
    @property
    def is_thread_reply(self) -> bool:
        """Check if message is a reply in a thread."""
        return self.thread_id is not None
    
    def edit(self, new_content: str, editor_id: str, reason: Optional[str] = None) -> "Message":
        """
        Create an edited version of this message.
        
        Preserves edit history for auditability.
        """
        edit_record = MessageEdit(
            edited_at=datetime.utcnow(),
            previous_content=self.content,
            editor_id=editor_id,
            reason=reason,
        )
        
        # Create new message with updated content and edit history
        new_edits = self.edits.copy()
        new_edits.append(edit_record)
        
        return Message(
            id=self.id,
            content=new_content,
            message_type=self.message_type,
            sender_id=self.sender_id,
            channel_id=self.channel_id,
            thread_id=self.thread_id,
            created_at=self.created_at,
            edits=new_edits,
            artifact_ids=self.artifact_ids.copy(),
            metadata=self.metadata.copy(),
        )
    
    def to_dict(self) -> dict:
        """Serialize message to dictionary."""
        return {
            "id": self.id,
            "content": self.content,
            "message_type": self.message_type.value,
            "sender_id": self.sender_id,
            "channel_id": self.channel_id,
            "thread_id": self.thread_id,
            "created_at": self.created_at.isoformat(),
            "is_edited": self.is_edited,
            "edit_count": len(self.edits),
            "artifact_ids": self.artifact_ids,
            "metadata": self.metadata,
        }
    
    def __str__(self) -> str:
        """Human-readable representation."""
        edited = " (edited)" if self.is_edited else ""
        thread = f" [thread:{self.thread_id[:8]}]" if self.thread_id else ""
        return f"[{self.sender_id}]{thread}{edited}: {self.content[:100]}"


def create_request(
    sender_id: str,
    channel_id: str,
    content: str,
    request_type: str,
    **kwargs
) -> Message:
    """Helper to create a REQUEST type message."""
    return Message(
        sender_id=sender_id,
        channel_id=channel_id,
        content=content,
        message_type=MessageType.REQUEST,
        metadata={"request_type": request_type, **kwargs},
    )


def create_response(
    sender_id: str,
    channel_id: str,
    content: str,
    in_response_to: str,
    thread_id: Optional[str] = None,
    **kwargs
) -> Message:
    """Helper to create a RESPONSE type message."""
    return Message(
        sender_id=sender_id,
        channel_id=channel_id,
        content=content,
        message_type=MessageType.RESPONSE,
        thread_id=thread_id,
        metadata={"in_response_to": in_response_to, **kwargs},
    )
