"""
Handoff Primitive

Handoffs are how agents pass work or context to each other.
They're more structured than just posting a message - they include
context, expectations, and acknowledgment.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Any
from enum import Enum
import uuid


class HandoffReason(Enum):
    """Why work is being handed off."""
    
    # Capability-based
    CAPABILITY_NEEDED = "capability_needed"  # Need a capability I don't have
    BETTER_SUITED = "better_suited"          # Another agent is better for this
    
    # Workload-based
    AT_CAPACITY = "at_capacity"              # I'm too busy
    LOAD_BALANCING = "load_balancing"        # Distributing work
    
    # Process-based
    NEXT_STEP = "next_step"                  # Moving to next phase
    REVIEW_NEEDED = "review_needed"          # Need someone to review
    APPROVAL_NEEDED = "approval_needed"      # Need approval to continue
    
    # Issue-based
    STUCK = "stuck"                          # Can't make progress
    ERROR = "error"                          # Hit an error
    ESCALATION = "escalation"                # Needs higher-level attention
    
    # Completion
    COMPLETED = "completed"                  # Passing back completed work


class HandoffStatus(Enum):
    """Status of a handoff."""
    
    PENDING = "pending"          # Created, waiting for acceptance
    ACCEPTED = "accepted"        # Recipient accepted
    REJECTED = "rejected"        # Recipient rejected
    IN_PROGRESS = "in_progress"  # Being processed
    COMPLETED = "completed"      # Successfully handled
    CANCELLED = "cancelled"      # Cancelled by sender
    EXPIRED = "expired"          # Timed out


@dataclass
class HandoffContext:
    """
    Context being passed in a handoff.
    
    This bundles everything the receiving agent needs to continue the work.
    """
    
    # Summary for quick understanding
    summary: str = ""
    
    # Detailed context
    background: str = ""          # What led to this point
    current_state: str = ""       # Where things stand now
    expected_outcome: str = ""    # What success looks like
    
    # Linked resources
    message_ids: list[str] = field(default_factory=list)
    thread_ids: list[str] = field(default_factory=list)
    artifact_ids: list[str] = field(default_factory=list)
    task_ids: list[str] = field(default_factory=list)
    
    # Structured data
    data: dict = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            "summary": self.summary,
            "background": self.background,
            "current_state": self.current_state,
            "expected_outcome": self.expected_outcome,
            "message_ids": self.message_ids,
            "thread_ids": self.thread_ids,
            "artifact_ids": self.artifact_ids,
            "task_ids": self.task_ids,
            "data": self.data,
        }


@dataclass
class Handoff:
    """
    A handoff of work from one agent to another.
    
    Key concepts:
    - Handoffs are explicit (not just hoping someone picks up a message)
    - They include context so the receiver can continue effectively
    - They require acknowledgment (accept/reject)
    - They track completion status
    
    Design decisions:
    - Handoffs are first-class objects, not just message metadata
    - Context is structured for machine consumption
    - Handoffs can be to a specific agent or to any agent with capability
    - Expiration prevents stale handoffs
    """
    
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    # Participants
    from_agent: str = ""                  # Who is handing off
    to_agent: Optional[str] = None        # Specific recipient (or None for open)
    to_capability: Optional[str] = None   # Required capability (for open handoffs)
    
    # Reason and context
    reason: HandoffReason = HandoffReason.NEXT_STEP
    context: HandoffContext = field(default_factory=HandoffContext)
    
    # Status
    status: HandoffStatus = HandoffStatus.PENDING
    
    # Location
    channel_id: Optional[str] = None
    thread_id: Optional[str] = None       # Handoff discussion thread
    
    # Timing
    created_at: datetime = field(default_factory=datetime.utcnow)
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    # Response
    accepted_by: Optional[str] = None     # Who accepted (may differ from to_agent)
    rejection_reason: str = ""
    completion_notes: str = ""
    
    # Priority
    is_urgent: bool = False
    
    @property
    def is_open(self) -> bool:
        """Check if handoff is still waiting for action."""
        return self.status in (HandoffStatus.PENDING, HandoffStatus.ACCEPTED, HandoffStatus.IN_PROGRESS)
    
    @property
    def is_targeted(self) -> bool:
        """Check if handoff is to a specific agent."""
        return self.to_agent is not None
    
    @property
    def is_expired(self) -> bool:
        """Check if handoff has expired."""
        if self.expires_at and datetime.utcnow() > self.expires_at:
            return True
        return self.status == HandoffStatus.EXPIRED
    
    def accept(self, agent_id: str) -> "Handoff":
        """Accept the handoff."""
        self.status = HandoffStatus.ACCEPTED
        self.accepted_by = agent_id
        self.accepted_at = datetime.utcnow()
        return self
    
    def reject(self, agent_id: str, reason: str = "") -> "Handoff":
        """Reject the handoff."""
        self.status = HandoffStatus.REJECTED
        self.rejection_reason = reason
        return self
    
    def start(self) -> "Handoff":
        """Mark handoff as being worked on."""
        self.status = HandoffStatus.IN_PROGRESS
        return self
    
    def complete(self, notes: str = "") -> "Handoff":
        """Mark handoff as completed."""
        self.status = HandoffStatus.COMPLETED
        self.completed_at = datetime.utcnow()
        self.completion_notes = notes
        return self
    
    def cancel(self) -> "Handoff":
        """Cancel the handoff."""
        self.status = HandoffStatus.CANCELLED
        return self
    
    def expire(self) -> "Handoff":
        """Mark handoff as expired."""
        self.status = HandoffStatus.EXPIRED
        return self
    
    def to_dict(self) -> dict:
        """Serialize to dictionary."""
        return {
            "id": self.id,
            "from_agent": self.from_agent,
            "to_agent": self.to_agent,
            "to_capability": self.to_capability,
            "reason": self.reason.value,
            "status": self.status.value,
            "context": self.context.to_dict(),
            "channel_id": self.channel_id,
            "thread_id": self.thread_id,
            "is_urgent": self.is_urgent,
            "is_open": self.is_open,
            "is_targeted": self.is_targeted,
            "created_at": self.created_at.isoformat(),
            "accepted_at": self.accepted_at.isoformat() if self.accepted_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "accepted_by": self.accepted_by,
        }
    
    def __str__(self) -> str:
        status_icons = {
            HandoffStatus.PENDING: "⏳",
            HandoffStatus.ACCEPTED: "🤝",
            HandoffStatus.REJECTED: "❌",
            HandoffStatus.IN_PROGRESS: "🔄",
            HandoffStatus.COMPLETED: "✅",
            HandoffStatus.CANCELLED: "🚫",
            HandoffStatus.EXPIRED: "⏰",
        }
        icon = status_icons.get(self.status, "❓")
        target = self.to_agent or f"[{self.to_capability}]"
        urgent = "🚨 " if self.is_urgent else ""
        return f"{urgent}{icon} {self.from_agent[:8]} -> {target}: {self.reason.value}"


class HandoffManager:
    """
    Manages handoffs within a workspace.
    """
    
    def __init__(self):
        self._handoffs: dict[str, Handoff] = {}
        self._by_sender: dict[str, list[str]] = {}
        self._by_recipient: dict[str, list[str]] = {}
        self._pending_by_capability: dict[str, list[str]] = {}
    
    def create(
        self,
        from_agent: str,
        reason: HandoffReason,
        context: HandoffContext,
        to_agent: Optional[str] = None,
        to_capability: Optional[str] = None,
        channel_id: Optional[str] = None,
        is_urgent: bool = False,
    ) -> Handoff:
        """Create a new handoff."""
        if not to_agent and not to_capability:
            raise ValueError("Must specify either to_agent or to_capability")
        
        handoff = Handoff(
            from_agent=from_agent,
            to_agent=to_agent,
            to_capability=to_capability,
            reason=reason,
            context=context,
            channel_id=channel_id,
            is_urgent=is_urgent,
        )
        
        return self.add(handoff)
    
    def add(self, handoff: Handoff) -> Handoff:
        """Add a handoff to the manager."""
        self._handoffs[handoff.id] = handoff
        
        # Index by sender
        if handoff.from_agent not in self._by_sender:
            self._by_sender[handoff.from_agent] = []
        self._by_sender[handoff.from_agent].append(handoff.id)
        
        # Index by recipient
        if handoff.to_agent:
            if handoff.to_agent not in self._by_recipient:
                self._by_recipient[handoff.to_agent] = []
            self._by_recipient[handoff.to_agent].append(handoff.id)
        
        # Index by capability (for open handoffs)
        if handoff.to_capability:
            if handoff.to_capability not in self._pending_by_capability:
                self._pending_by_capability[handoff.to_capability] = []
            self._pending_by_capability[handoff.to_capability].append(handoff.id)
        
        return handoff
    
    def get(self, handoff_id: str) -> Optional[Handoff]:
        """Get a handoff by ID."""
        return self._handoffs.get(handoff_id)
    
    def get_pending_for_agent(self, agent_id: str) -> list[Handoff]:
        """Get pending handoffs targeted at an agent."""
        handoff_ids = self._by_recipient.get(agent_id, [])
        handoffs = [self._handoffs[id] for id in handoff_ids if id in self._handoffs]
        return [h for h in handoffs if h.status == HandoffStatus.PENDING]
    
    def get_pending_for_capability(self, capability: str) -> list[Handoff]:
        """Get pending handoffs for a capability."""
        handoff_ids = self._pending_by_capability.get(capability, [])
        handoffs = [self._handoffs[id] for id in handoff_ids if id in self._handoffs]
        return [h for h in handoffs if h.status == HandoffStatus.PENDING]
    
    def get_sent_by(self, agent_id: str, open_only: bool = True) -> list[Handoff]:
        """Get handoffs sent by an agent."""
        handoff_ids = self._by_sender.get(agent_id, [])
        handoffs = [self._handoffs[id] for id in handoff_ids if id in self._handoffs]
        
        if open_only:
            handoffs = [h for h in handoffs if h.is_open]
        
        return sorted(handoffs, key=lambda h: h.created_at, reverse=True)
    
    def accept(self, handoff_id: str, agent_id: str) -> Optional[Handoff]:
        """Accept a handoff."""
        handoff = self.get(handoff_id)
        if not handoff or handoff.status != HandoffStatus.PENDING:
            return None
        
        handoff.accept(agent_id)
        
        # Update recipient index
        if agent_id not in self._by_recipient:
            self._by_recipient[agent_id] = []
        self._by_recipient[agent_id].append(handoff_id)
        
        # Remove from capability index
        if handoff.to_capability and handoff.to_capability in self._pending_by_capability:
            if handoff_id in self._pending_by_capability[handoff.to_capability]:
                self._pending_by_capability[handoff.to_capability].remove(handoff_id)
        
        return handoff
    
    def reject(
        self,
        handoff_id: str,
        agent_id: str,
        reason: str = "",
    ) -> Optional[Handoff]:
        """Reject a handoff."""
        handoff = self.get(handoff_id)
        if not handoff or handoff.status != HandoffStatus.PENDING:
            return None
        
        handoff.reject(agent_id, reason)
        return handoff
    
    def complete(self, handoff_id: str, notes: str = "") -> Optional[Handoff]:
        """Complete a handoff."""
        handoff = self.get(handoff_id)
        if not handoff:
            return None
        
        handoff.complete(notes)
        return handoff
    
    def cleanup_expired(self) -> list[str]:
        """Mark expired handoffs."""
        expired = []
        now = datetime.utcnow()
        
        for handoff in self._handoffs.values():
            if handoff.is_open and handoff.expires_at and now > handoff.expires_at:
                handoff.expire()
                expired.append(handoff.id)
        
        return expired
    
    def get_stats(self) -> dict:
        """Get handoff statistics."""
        all_handoffs = list(self._handoffs.values())
        
        return {
            "total": len(all_handoffs),
            "pending": len([h for h in all_handoffs if h.status == HandoffStatus.PENDING]),
            "in_progress": len([h for h in all_handoffs if h.status == HandoffStatus.IN_PROGRESS]),
            "completed": len([h for h in all_handoffs if h.status == HandoffStatus.COMPLETED]),
            "rejected": len([h for h in all_handoffs if h.status == HandoffStatus.REJECTED]),
            "by_reason": {
                r.value: len([h for h in all_handoffs if h.reason == r])
                for r in HandoffReason
            },
        }
