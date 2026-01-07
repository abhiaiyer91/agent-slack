"""
Workflow Primitive

Workflows are multi-step processes involving multiple agents.
They define a sequence of steps, each handled by specific agents,
with automatic handoffs between steps.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any, Callable
from enum import Enum
import uuid


class WorkflowStatus(Enum):
    """Status of a workflow."""
    
    DRAFT = "draft"              # Being defined
    READY = "ready"              # Ready to start
    RUNNING = "running"          # Currently executing
    PAUSED = "paused"            # Temporarily paused
    WAITING = "waiting"          # Waiting for external input
    COMPLETED = "completed"      # Successfully finished
    FAILED = "failed"            # Failed with error
    CANCELLED = "cancelled"      # Manually cancelled


class StepStatus(Enum):
    """Status of a workflow step."""
    
    PENDING = "pending"          # Not yet started
    RUNNING = "running"          # Currently executing
    COMPLETED = "completed"      # Successfully finished
    FAILED = "failed"            # Failed
    SKIPPED = "skipped"          # Skipped (conditional)


@dataclass
class WorkflowStep:
    """
    A single step in a workflow.
    
    Each step is executed by an agent and can produce outputs
    that feed into subsequent steps.
    """
    
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    # Identity
    name: str = ""
    description: str = ""
    
    # Execution
    assigned_to: Optional[str] = None        # Specific agent ID
    required_capability: Optional[str] = None # Or any agent with this capability
    
    # Status
    status: StepStatus = StepStatus.PENDING
    
    # Input/Output
    input_mapping: dict[str, str] = field(default_factory=dict)  # step_output -> this_input
    inputs: dict = field(default_factory=dict)
    outputs: dict = field(default_factory=dict)
    
    # Execution details
    executed_by: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: str = ""
    
    # Conditions
    run_if: Optional[str] = None             # Condition expression
    skip_on_failure: bool = False            # Continue workflow if this fails
    
    # Retry
    max_retries: int = 0
    retry_count: int = 0
    
    @property
    def is_complete(self) -> bool:
        return self.status in (StepStatus.COMPLETED, StepStatus.FAILED, StepStatus.SKIPPED)
    
    @property
    def duration(self) -> Optional[float]:
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    def start(self, agent_id: str) -> "WorkflowStep":
        """Mark step as started."""
        self.status = StepStatus.RUNNING
        self.executed_by = agent_id
        self.started_at = datetime.utcnow()
        return self
    
    def complete(self, outputs: dict = None) -> "WorkflowStep":
        """Mark step as completed."""
        self.status = StepStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        if outputs:
            self.outputs = outputs
        return self
    
    def fail(self, error: str) -> "WorkflowStep":
        """Mark step as failed."""
        self.status = StepStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.error_message = error
        return self
    
    def skip(self) -> "WorkflowStep":
        """Mark step as skipped."""
        self.status = StepStatus.SKIPPED
        self.completed_at = datetime.utcnow()
        return self
    
    def reset(self) -> "WorkflowStep":
        """Reset step for retry."""
        self.status = StepStatus.PENDING
        self.started_at = None
        self.completed_at = None
        self.error_message = ""
        self.outputs = {}
        self.retry_count += 1
        return self
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "assigned_to": self.assigned_to,
            "required_capability": self.required_capability,
            "status": self.status.value,
            "executed_by": self.executed_by,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "duration": self.duration,
            "error_message": self.error_message,
            "inputs": self.inputs,
            "outputs": self.outputs,
        }
    
    def __str__(self) -> str:
        status_icons = {
            StepStatus.PENDING: "⏸️",
            StepStatus.RUNNING: "🔄",
            StepStatus.COMPLETED: "✅",
            StepStatus.FAILED: "❌",
            StepStatus.SKIPPED: "⏭️",
        }
        icon = status_icons.get(self.status, "❓")
        agent = self.executed_by or self.assigned_to or f"[{self.required_capability}]"
        return f"{icon} {self.name} ({agent})"


@dataclass
class Workflow:
    """
    A multi-step workflow executed by multiple agents.
    
    Key concepts:
    - Workflows define a sequence of steps
    - Each step can be assigned to an agent or capability
    - Outputs from one step can feed into the next
    - Workflows track overall progress and can be paused/resumed
    
    Design decisions:
    - Workflows are declarative (define what, not how)
    - Step execution is handled by the workflow engine
    - Supports both linear and conditional flows
    - Can be triggered manually or by events
    """
    
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    # Identity
    name: str = ""
    description: str = ""
    
    # Steps
    steps: list[WorkflowStep] = field(default_factory=list)
    current_step_index: int = 0
    
    # Status
    status: WorkflowStatus = WorkflowStatus.DRAFT
    
    # Context
    channel_id: Optional[str] = None
    thread_id: Optional[str] = None       # Discussion thread for workflow
    triggered_by: Optional[str] = None    # Agent or event that started it
    
    # Global inputs/outputs
    inputs: dict = field(default_factory=dict)
    outputs: dict = field(default_factory=dict)
    
    # Timing
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Error handling
    error_message: str = ""
    continue_on_step_failure: bool = False
    
    @property
    def is_running(self) -> bool:
        return self.status == WorkflowStatus.RUNNING
    
    @property
    def is_complete(self) -> bool:
        return self.status in (
            WorkflowStatus.COMPLETED,
            WorkflowStatus.FAILED,
            WorkflowStatus.CANCELLED,
        )
    
    @property
    def current_step(self) -> Optional[WorkflowStep]:
        if 0 <= self.current_step_index < len(self.steps):
            return self.steps[self.current_step_index]
        return None
    
    @property
    def progress_percent(self) -> int:
        if not self.steps:
            return 0
        completed = sum(1 for s in self.steps if s.is_complete)
        return int((completed / len(self.steps)) * 100)
    
    @property
    def duration(self) -> Optional[float]:
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None
    
    def add_step(
        self,
        name: str,
        description: str = "",
        assigned_to: Optional[str] = None,
        required_capability: Optional[str] = None,
        **kwargs,
    ) -> WorkflowStep:
        """Add a step to the workflow."""
        step = WorkflowStep(
            name=name,
            description=description,
            assigned_to=assigned_to,
            required_capability=required_capability,
            **kwargs,
        )
        self.steps.append(step)
        return step
    
    def start(self, triggered_by: str, inputs: dict = None) -> "Workflow":
        """Start the workflow."""
        self.status = WorkflowStatus.RUNNING
        self.triggered_by = triggered_by
        self.started_at = datetime.utcnow()
        self.current_step_index = 0
        
        if inputs:
            self.inputs = inputs
        
        return self
    
    def advance(self) -> Optional[WorkflowStep]:
        """Advance to the next step."""
        self.current_step_index += 1
        
        if self.current_step_index >= len(self.steps):
            self.complete()
            return None
        
        return self.current_step
    
    def complete(self, outputs: dict = None) -> "Workflow":
        """Mark workflow as completed."""
        self.status = WorkflowStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        
        if outputs:
            self.outputs = outputs
        else:
            # Collect outputs from all steps
            for step in self.steps:
                self.outputs[step.name] = step.outputs
        
        return self
    
    def fail(self, error: str) -> "Workflow":
        """Mark workflow as failed."""
        self.status = WorkflowStatus.FAILED
        self.completed_at = datetime.utcnow()
        self.error_message = error
        return self
    
    def pause(self) -> "Workflow":
        """Pause the workflow."""
        self.status = WorkflowStatus.PAUSED
        return self
    
    def resume(self) -> "Workflow":
        """Resume a paused workflow."""
        if self.status == WorkflowStatus.PAUSED:
            self.status = WorkflowStatus.RUNNING
        return self
    
    def cancel(self) -> "Workflow":
        """Cancel the workflow."""
        self.status = WorkflowStatus.CANCELLED
        self.completed_at = datetime.utcnow()
        return self
    
    def get_step_inputs(self, step: WorkflowStep) -> dict:
        """
        Get inputs for a step based on input mapping.
        
        Resolves references to outputs from previous steps.
        """
        inputs = step.inputs.copy()
        
        for target_key, source in step.input_mapping.items():
            # Source format: "step_name.output_key" or "workflow.input_key"
            parts = source.split(".", 1)
            
            if len(parts) == 2:
                source_name, source_key = parts
                
                if source_name == "workflow":
                    if source_key in self.inputs:
                        inputs[target_key] = self.inputs[source_key]
                else:
                    # Find step by name
                    for s in self.steps:
                        if s.name == source_name and source_key in s.outputs:
                            inputs[target_key] = s.outputs[source_key]
                            break
        
        return inputs
    
    def get_summary(self) -> dict:
        """Get a summary of workflow state."""
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status.value,
            "progress_percent": self.progress_percent,
            "current_step": self.current_step.name if self.current_step else None,
            "steps_completed": sum(1 for s in self.steps if s.status == StepStatus.COMPLETED),
            "steps_total": len(self.steps),
            "duration": self.duration,
        }
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "status": self.status.value,
            "steps": [s.to_dict() for s in self.steps],
            "current_step_index": self.current_step_index,
            "progress_percent": self.progress_percent,
            "channel_id": self.channel_id,
            "thread_id": self.thread_id,
            "triggered_by": self.triggered_by,
            "inputs": self.inputs,
            "outputs": self.outputs,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "error_message": self.error_message,
        }
    
    def __str__(self) -> str:
        status_icons = {
            WorkflowStatus.DRAFT: "📝",
            WorkflowStatus.READY: "🟢",
            WorkflowStatus.RUNNING: "🔄",
            WorkflowStatus.PAUSED: "⏸️",
            WorkflowStatus.WAITING: "⏳",
            WorkflowStatus.COMPLETED: "✅",
            WorkflowStatus.FAILED: "❌",
            WorkflowStatus.CANCELLED: "🚫",
        }
        icon = status_icons.get(self.status, "❓")
        return f"{icon} {self.name} ({self.progress_percent}% - {len(self.steps)} steps)"


class WorkflowBuilder:
    """Builder pattern for creating workflows."""
    
    def __init__(self, name: str, description: str = ""):
        self._workflow = Workflow(name=name, description=description)
    
    def add_step(
        self,
        name: str,
        description: str = "",
        assigned_to: Optional[str] = None,
        required_capability: Optional[str] = None,
        **kwargs,
    ) -> "WorkflowBuilder":
        """Add a step to the workflow."""
        self._workflow.add_step(
            name=name,
            description=description,
            assigned_to=assigned_to,
            required_capability=required_capability,
            **kwargs,
        )
        return self
    
    def with_channel(self, channel_id: str) -> "WorkflowBuilder":
        """Set the channel for the workflow."""
        self._workflow.channel_id = channel_id
        return self
    
    def with_inputs(self, inputs: dict) -> "WorkflowBuilder":
        """Set initial inputs for the workflow."""
        self._workflow.inputs = inputs
        return self
    
    def continue_on_failure(self) -> "WorkflowBuilder":
        """Allow workflow to continue if a step fails."""
        self._workflow.continue_on_step_failure = True
        return self
    
    def build(self) -> Workflow:
        """Build and return the workflow."""
        self._workflow.status = WorkflowStatus.READY
        return self._workflow


class WorkflowManager:
    """Manages workflows within a workspace."""
    
    def __init__(self):
        self._workflows: dict[str, Workflow] = {}
        self._templates: dict[str, Workflow] = {}
    
    def add(self, workflow: Workflow) -> Workflow:
        """Add a workflow."""
        self._workflows[workflow.id] = workflow
        return workflow
    
    def get(self, workflow_id: str) -> Optional[Workflow]:
        """Get a workflow by ID."""
        return self._workflows.get(workflow_id)
    
    def list_running(self) -> list[Workflow]:
        """List all running workflows."""
        return [w for w in self._workflows.values() if w.is_running]
    
    def list_by_channel(self, channel_id: str) -> list[Workflow]:
        """List workflows in a channel."""
        return [w for w in self._workflows.values() if w.channel_id == channel_id]
    
    def save_template(self, name: str, workflow: Workflow) -> None:
        """Save a workflow as a reusable template."""
        self._templates[name] = workflow
    
    def create_from_template(self, template_name: str) -> Optional[Workflow]:
        """Create a new workflow from a template."""
        template = self._templates.get(template_name)
        if not template:
            return None
        
        # Deep copy the template
        new_workflow = Workflow(
            name=template.name,
            description=template.description,
            continue_on_step_failure=template.continue_on_step_failure,
        )
        
        for step in template.steps:
            new_workflow.add_step(
                name=step.name,
                description=step.description,
                assigned_to=step.assigned_to,
                required_capability=step.required_capability,
                input_mapping=step.input_mapping.copy(),
                skip_on_failure=step.skip_on_failure,
                max_retries=step.max_retries,
            )
        
        new_workflow.status = WorkflowStatus.READY
        return self.add(new_workflow)
    
    def get_stats(self) -> dict:
        """Get workflow statistics."""
        all_workflows = list(self._workflows.values())
        
        return {
            "total": len(all_workflows),
            "running": len([w for w in all_workflows if w.is_running]),
            "completed": len([w for w in all_workflows if w.status == WorkflowStatus.COMPLETED]),
            "failed": len([w for w in all_workflows if w.status == WorkflowStatus.FAILED]),
            "templates": len(self._templates),
        }
