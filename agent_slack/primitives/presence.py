"""
Presence Primitive

Presence tracks agent availability and activity. Unlike human users,
agent presence is more meaningful - it signals actual capacity to
handle work.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional
from enum import Enum


class PresenceStatus(Enum):
    """
    Agent presence status.
    
    Unlike human "away" status, agent presence has concrete meaning:
    - ONLINE: Ready to receive and process messages
    - BUSY: Processing something, may be slow
    - AWAY: Not actively monitoring (e.g., batch mode)
    - OFFLINE: Not running / unavailable
    - DND: Explicitly not accepting new work
    """
    
    ONLINE = "online"
    BUSY = "busy"
    AWAY = "away"
    OFFLINE = "offline"
    DO_NOT_DISTURB = "dnd"


@dataclass
class Presence:
    """
    An agent's presence state.
    
    Key concepts:
    - Presence indicates availability for new work
    - Status message provides context (what agent is doing)
    - Activity tracking enables "last seen" functionality
    - Presence can include capacity information
    
    Design decisions:
    - Presence is lightweight and frequently updated
    - Includes optional capacity/workload information
    - Expiration allows automatic offline marking
    """
    
    agent_id: str
    
    # Current status
    status: PresenceStatus = PresenceStatus.OFFLINE
    status_message: str = ""
    
    # Activity tracking
    last_activity: Optional[datetime] = None
    last_status_change: Optional[datetime] = None
    
    # Capacity information
    current_workload: int = 0           # Number of active tasks
    max_workload: int = 5               # Maximum concurrent tasks
    
    # Presence expiration (for heartbeat-based systems)
    expires_at: Optional[datetime] = None
    heartbeat_interval: timedelta = field(default_factory=lambda: timedelta(seconds=30))
    
    @property
    def is_available(self) -> bool:
        """Check if agent is available for new work."""
        if self.status not in (PresenceStatus.ONLINE, PresenceStatus.BUSY):
            return False
        if self.has_capacity is False:
            return False
        return True
    
    @property
    def has_capacity(self) -> bool:
        """Check if agent has capacity for more work."""
        return self.current_workload < self.max_workload
    
    @property
    def capacity_remaining(self) -> int:
        """How many more tasks can this agent take."""
        return max(0, self.max_workload - self.current_workload)
    
    @property
    def is_expired(self) -> bool:
        """Check if presence has expired (heartbeat missed)."""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
    
    @property
    def effective_status(self) -> PresenceStatus:
        """Get status, accounting for expiration."""
        if self.is_expired:
            return PresenceStatus.OFFLINE
        return self.status
    
    def set_status(
        self,
        status: PresenceStatus,
        message: str = "",
    ) -> "Presence":
        """Update presence status."""
        self.status = status
        self.status_message = message
        self.last_status_change = datetime.utcnow()
        self._refresh_expiration()
        return self
    
    def go_online(self, message: str = "") -> "Presence":
        """Set agent as online and ready."""
        return self.set_status(PresenceStatus.ONLINE, message)
    
    def go_busy(self, message: str = "") -> "Presence":
        """Set agent as busy."""
        return self.set_status(PresenceStatus.BUSY, message)
    
    def go_offline(self) -> "Presence":
        """Set agent as offline."""
        return self.set_status(PresenceStatus.OFFLINE)
    
    def heartbeat(self) -> "Presence":
        """
        Record a heartbeat to keep presence alive.
        
        Should be called periodically by the agent.
        """
        self.last_activity = datetime.utcnow()
        self._refresh_expiration()
        return self
    
    def record_activity(self) -> "Presence":
        """Record that the agent did something."""
        self.last_activity = datetime.utcnow()
        self._refresh_expiration()
        return self
    
    def increment_workload(self) -> "Presence":
        """Increment workload (started a task)."""
        self.current_workload += 1
        self.record_activity()
        
        # Auto-set to busy if at capacity
        if not self.has_capacity and self.status == PresenceStatus.ONLINE:
            self.status = PresenceStatus.BUSY
            self.status_message = "At capacity"
        
        return self
    
    def decrement_workload(self) -> "Presence":
        """Decrement workload (finished a task)."""
        self.current_workload = max(0, self.current_workload - 1)
        self.record_activity()
        
        # Auto-set back to online if was at capacity
        if self.has_capacity and self.status == PresenceStatus.BUSY:
            if "capacity" in self.status_message.lower():
                self.status = PresenceStatus.ONLINE
                self.status_message = ""
        
        return self
    
    def _refresh_expiration(self) -> None:
        """Refresh the expiration time."""
        self.expires_at = datetime.utcnow() + self.heartbeat_interval
    
    def to_dict(self) -> dict:
        """Serialize to dictionary."""
        return {
            "agent_id": self.agent_id,
            "status": self.effective_status.value,
            "status_message": self.status_message,
            "is_available": self.is_available,
            "last_activity": self.last_activity.isoformat() if self.last_activity else None,
            "current_workload": self.current_workload,
            "max_workload": self.max_workload,
            "capacity_remaining": self.capacity_remaining,
        }
    
    def __str__(self) -> str:
        status_icons = {
            PresenceStatus.ONLINE: "🟢",
            PresenceStatus.BUSY: "🟡",
            PresenceStatus.AWAY: "🟠",
            PresenceStatus.OFFLINE: "⚫",
            PresenceStatus.DO_NOT_DISTURB: "🔴",
        }
        icon = status_icons.get(self.effective_status, "⚪")
        msg = f" - {self.status_message}" if self.status_message else ""
        capacity = f" [{self.current_workload}/{self.max_workload}]"
        return f"{icon} {self.agent_id[:12]}{capacity}{msg}"


class PresenceManager:
    """
    Manages presence for all agents in a workspace.
    
    Handles presence updates, queries, and expiration.
    """
    
    def __init__(self, heartbeat_interval: timedelta = timedelta(seconds=30)):
        self._presences: dict[str, Presence] = {}
        self.default_heartbeat_interval = heartbeat_interval
    
    def get_or_create(self, agent_id: str) -> Presence:
        """Get or create presence for an agent."""
        if agent_id not in self._presences:
            self._presences[agent_id] = Presence(
                agent_id=agent_id,
                heartbeat_interval=self.default_heartbeat_interval,
            )
        return self._presences[agent_id]
    
    def get(self, agent_id: str) -> Optional[Presence]:
        """Get presence for an agent."""
        return self._presences.get(agent_id)
    
    def update(
        self,
        agent_id: str,
        status: PresenceStatus,
        message: str = "",
    ) -> Presence:
        """Update an agent's presence."""
        presence = self.get_or_create(agent_id)
        presence.set_status(status, message)
        return presence
    
    def heartbeat(self, agent_id: str) -> Presence:
        """Record a heartbeat for an agent."""
        presence = self.get_or_create(agent_id)
        presence.heartbeat()
        return presence
    
    def get_online_agents(self) -> list[str]:
        """Get all agents that are online (not offline/DND)."""
        return [
            p.agent_id
            for p in self._presences.values()
            if p.effective_status in (PresenceStatus.ONLINE, PresenceStatus.BUSY)
        ]
    
    def get_available_agents(self) -> list[str]:
        """Get all agents that are available for new work."""
        return [
            p.agent_id
            for p in self._presences.values()
            if p.is_available
        ]
    
    def get_by_status(self, status: PresenceStatus) -> list[str]:
        """Get all agents with a specific status."""
        return [
            p.agent_id
            for p in self._presences.values()
            if p.effective_status == status
        ]
    
    def cleanup_expired(self) -> list[str]:
        """
        Mark expired presences as offline.
        
        Returns list of agent IDs that were marked offline.
        """
        expired = []
        for presence in self._presences.values():
            if presence.is_expired and presence.status != PresenceStatus.OFFLINE:
                presence.status = PresenceStatus.OFFLINE
                presence.status_message = "Heartbeat timeout"
                expired.append(presence.agent_id)
        return expired
    
    def get_all(self) -> list[Presence]:
        """Get all presence records."""
        return list(self._presences.values())
    
    def to_dict(self) -> dict:
        """Serialize all presence data."""
        return {
            "online_count": len(self.get_online_agents()),
            "available_count": len(self.get_available_agents()),
            "presences": {
                agent_id: p.to_dict()
                for agent_id, p in self._presences.items()
            },
        }
