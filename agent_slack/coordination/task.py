"""
Task Primitive

Tasks are units of work that agents can assign to each other.
They provide structure beyond simple messages - tracking state,
ownership, deadlines, and completion.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Any
from enum import Enum
import uuid


class TaskStatus(Enum):
    """Status of a task."""
    
    PENDING = "pending"          # Created but not started
    ASSIGNED = "assigned"        # Assigned to an agent
    IN_PROGRESS = "in_progress"  # Being worked on
    BLOCKED = "blocked"          # Waiting on something
    IN_REVIEW = "in_review"      # Completed, awaiting review
    COMPLETED = "completed"      # Successfully finished
    CANCELLED = "cancelled"      # Cancelled before completion
    FAILED = "failed"            # Failed to complete


class TaskPriority(Enum):
    """Priority levels for tasks."""
    
    CRITICAL = "critical"    # Drop everything
    HIGH = "high"            # Important, do soon
    MEDIUM = "medium"        # Normal priority
    LOW = "low"              # Do when convenient
    BACKGROUND = "background" # No rush


@dataclass
class TaskComment:
    """A comment or update on a task."""
    
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    agent_id: str = ""
    content: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)
    
    # Optional: link to message that triggered this comment
    message_id: Optional[str] = None


@dataclass
class Task:
    """
    A task assigned to an agent.
    
    Key concepts:
    - Tasks have clear ownership (assignee)
    - Tasks track state through a lifecycle
    - Tasks can be linked to messages/threads
    - Tasks have structured input/output
    
    Design decisions:
    - Tasks are separate from messages (but can be linked)
    - Multiple agents can be involved (creator, assignee, reviewers)
    - Tasks support blocking/dependencies
    - Progress and output are tracked
    """
    
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    # Task description
    title: str = ""
    description: str = ""
    
    # Ownership
    created_by: str = ""             # Agent who created the task
    assigned_to: Optional[str] = None # Agent responsible for completion
    reviewers: list[str] = field(default_factory=list)
    
    # Status and priority
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    
    # Context links
    channel_id: Optional[str] = None  # Channel where task was created
    thread_id: Optional[str] = None   # Thread for task discussion
    source_message_id: Optional[str] = None  # Message that spawned task
    
    # Timing
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    due_at: Optional[datetime] = None
    
    # Progress tracking
    progress_percent: int = 0         # 0-100
    status_message: str = ""          # Current status text
    
    # Input/output
    input_data: dict = field(default_factory=dict)
    output_data: dict = field(default_factory=dict)
    
    # Dependencies
    blocked_by: list[str] = field(default_factory=list)  # Task IDs
    blocks: list[str] = field(default_factory=list)      # Task IDs
    
    # History
    comments: list[TaskComment] = field(default_factory=list)
    
    # Metadata
    tags: list[str] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    
    @property
    def is_open(self) -> bool:
        """Check if task is still open (not completed/cancelled/failed)."""
        return self.status not in (
            TaskStatus.COMPLETED,
            TaskStatus.CANCELLED,
            TaskStatus.FAILED,
        )
    
    @property
    def is_blocked(self) -> bool:
        """Check if task is blocked."""
        return self.status == TaskStatus.BLOCKED or len(self.blocked_by) > 0
    
    @property
    def is_overdue(self) -> bool:
        """Check if task is past due date."""
        if not self.due_at:
            return False
        return datetime.utcnow() > self.due_at and self.is_open
    
    @property
    def duration(self) -> Optional[timedelta]:
        """Get the duration of the task (if started and completed)."""
        if self.started_at and self.completed_at:
            return self.completed_at - self.started_at
        return None
    
    def assign(self, agent_id: str) -> "Task":
        """Assign the task to an agent."""
        self.assigned_to = agent_id
        self.status = TaskStatus.ASSIGNED
        return self
    
    def start(self) -> "Task":
        """Mark task as started."""
        self.status = TaskStatus.IN_PROGRESS
        self.started_at = datetime.utcnow()
        return self
    
    def update_progress(
        self,
        percent: int,
        message: str = "",
    ) -> "Task":
        """Update task progress."""
        self.progress_percent = min(100, max(0, percent))
        if message:
            self.status_message = message
        return self
    
    def block(self, reason: str, blocked_by_task_id: Optional[str] = None) -> "Task":
        """Mark task as blocked."""
        self.status = TaskStatus.BLOCKED
        self.status_message = reason
        if blocked_by_task_id:
            self.blocked_by.append(blocked_by_task_id)
        return self
    
    def unblock(self, task_id: Optional[str] = None) -> "Task":
        """Unblock the task."""
        if task_id and task_id in self.blocked_by:
            self.blocked_by.remove(task_id)
        
        if not self.blocked_by:
            self.status = TaskStatus.IN_PROGRESS
            self.status_message = ""
        return self
    
    def submit_for_review(self, output: dict = None) -> "Task":
        """Submit task for review."""
        self.status = TaskStatus.IN_REVIEW
        if output:
            self.output_data = output
        self.progress_percent = 100
        return self
    
    def complete(self, output: dict = None) -> "Task":
        """Mark task as completed."""
        self.status = TaskStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.progress_percent = 100
        if output:
            self.output_data = output
        return self
    
    def cancel(self, reason: str = "") -> "Task":
        """Cancel the task."""
        self.status = TaskStatus.CANCELLED
        self.completed_at = datetime.utcnow()
        self.status_message = reason
        return self
    
    def fail(self, reason: str = "", error: Any = None) -> "Task":
        """Mark task as failed."""
        self.status = TaskStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.status_message = reason
        if error:
            self.output_data["error"] = str(error)
        return self
    
    def add_comment(
        self,
        agent_id: str,
        content: str,
        message_id: Optional[str] = None,
    ) -> TaskComment:
        """Add a comment to the task."""
        comment = TaskComment(
            agent_id=agent_id,
            content=content,
            message_id=message_id,
        )
        self.comments.append(comment)
        return comment
    
    def to_dict(self) -> dict:
        """Serialize to dictionary."""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "created_by": self.created_by,
            "assigned_to": self.assigned_to,
            "reviewers": self.reviewers,
            "status": self.status.value,
            "priority": self.priority.value,
            "channel_id": self.channel_id,
            "thread_id": self.thread_id,
            "progress_percent": self.progress_percent,
            "status_message": self.status_message,
            "is_open": self.is_open,
            "is_blocked": self.is_blocked,
            "is_overdue": self.is_overdue,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "due_at": self.due_at.isoformat() if self.due_at else None,
            "tags": self.tags,
            "comment_count": len(self.comments),
        }
    
    def __str__(self) -> str:
        status_icons = {
            TaskStatus.PENDING: "⏸️",
            TaskStatus.ASSIGNED: "📋",
            TaskStatus.IN_PROGRESS: "🔄",
            TaskStatus.BLOCKED: "🚫",
            TaskStatus.IN_REVIEW: "👀",
            TaskStatus.COMPLETED: "✅",
            TaskStatus.CANCELLED: "❌",
            TaskStatus.FAILED: "💥",
        }
        icon = status_icons.get(self.status, "❓")
        assignee = f" -> {self.assigned_to[:8]}" if self.assigned_to else ""
        return f"{icon} [{self.priority.value}] {self.title}{assignee}"


class TaskManager:
    """
    Manages tasks within a workspace.
    
    Handles task lifecycle, assignment, and queries.
    """
    
    def __init__(self):
        self._tasks: dict[str, Task] = {}
        self._by_assignee: dict[str, list[str]] = {}
        self._by_channel: dict[str, list[str]] = {}
    
    def create(
        self,
        title: str,
        created_by: str,
        description: str = "",
        priority: TaskPriority = TaskPriority.MEDIUM,
        assigned_to: Optional[str] = None,
        channel_id: Optional[str] = None,
        **kwargs,
    ) -> Task:
        """Create a new task."""
        task = Task(
            title=title,
            description=description,
            created_by=created_by,
            assigned_to=assigned_to,
            priority=priority,
            channel_id=channel_id,
            **kwargs,
        )
        
        if assigned_to:
            task.status = TaskStatus.ASSIGNED
        
        return self.add(task)
    
    def add(self, task: Task) -> Task:
        """Add a task to the manager."""
        self._tasks[task.id] = task
        
        # Index by assignee
        if task.assigned_to:
            if task.assigned_to not in self._by_assignee:
                self._by_assignee[task.assigned_to] = []
            self._by_assignee[task.assigned_to].append(task.id)
        
        # Index by channel
        if task.channel_id:
            if task.channel_id not in self._by_channel:
                self._by_channel[task.channel_id] = []
            self._by_channel[task.channel_id].append(task.id)
        
        return task
    
    def get(self, task_id: str) -> Optional[Task]:
        """Get a task by ID."""
        return self._tasks.get(task_id)
    
    def get_by_assignee(
        self,
        agent_id: str,
        open_only: bool = True,
    ) -> list[Task]:
        """Get tasks assigned to an agent."""
        task_ids = self._by_assignee.get(agent_id, [])
        tasks = [self._tasks[id] for id in task_ids if id in self._tasks]
        
        if open_only:
            tasks = [t for t in tasks if t.is_open]
        
        return sorted(tasks, key=lambda t: (t.priority.value, t.created_at))
    
    def get_by_channel(
        self,
        channel_id: str,
        open_only: bool = True,
    ) -> list[Task]:
        """Get tasks in a channel."""
        task_ids = self._by_channel.get(channel_id, [])
        tasks = [self._tasks[id] for id in task_ids if id in self._tasks]
        
        if open_only:
            tasks = [t for t in tasks if t.is_open]
        
        return sorted(tasks, key=lambda t: t.created_at, reverse=True)
    
    def get_pending(self) -> list[Task]:
        """Get all pending (unassigned) tasks."""
        return [t for t in self._tasks.values() if t.status == TaskStatus.PENDING]
    
    def get_blocked(self) -> list[Task]:
        """Get all blocked tasks."""
        return [t for t in self._tasks.values() if t.is_blocked]
    
    def get_overdue(self) -> list[Task]:
        """Get all overdue tasks."""
        return [t for t in self._tasks.values() if t.is_overdue]
    
    def get_by_status(self, status: TaskStatus) -> list[Task]:
        """Get all tasks with a specific status."""
        return [t for t in self._tasks.values() if t.status == status]
    
    def assign(self, task_id: str, agent_id: str) -> Optional[Task]:
        """Assign a task to an agent."""
        task = self.get(task_id)
        if not task:
            return None
        
        # Remove from old assignee index
        if task.assigned_to and task.assigned_to in self._by_assignee:
            if task_id in self._by_assignee[task.assigned_to]:
                self._by_assignee[task.assigned_to].remove(task_id)
        
        # Add to new assignee index
        if agent_id not in self._by_assignee:
            self._by_assignee[agent_id] = []
        self._by_assignee[agent_id].append(task_id)
        
        task.assign(agent_id)
        return task
    
    def list_all(
        self,
        open_only: bool = False,
        limit: int = 100,
    ) -> list[Task]:
        """List all tasks."""
        tasks = list(self._tasks.values())
        
        if open_only:
            tasks = [t for t in tasks if t.is_open]
        
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        return tasks[:limit]
    
    def get_stats(self) -> dict:
        """Get task statistics."""
        all_tasks = list(self._tasks.values())
        
        return {
            "total": len(all_tasks),
            "open": len([t for t in all_tasks if t.is_open]),
            "completed": len([t for t in all_tasks if t.status == TaskStatus.COMPLETED]),
            "failed": len([t for t in all_tasks if t.status == TaskStatus.FAILED]),
            "blocked": len([t for t in all_tasks if t.is_blocked]),
            "overdue": len([t for t in all_tasks if t.is_overdue]),
            "by_priority": {
                p.value: len([t for t in all_tasks if t.priority == p])
                for p in TaskPriority
            },
        }
