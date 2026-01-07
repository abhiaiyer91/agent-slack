"""
Thread Primitive

Threads enable focused sub-conversations branching off from a main message.
They keep channels clean while allowing deep dives on specific topics.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Iterator
import uuid

from .message import Message


@dataclass
class Thread:
    """
    A thread of replies to a message.
    
    Key concepts:
    - Threads branch off from a parent message
    - Replies in a thread don't clutter the main channel
    - Threads track participants and activity
    - The parent message "owns" the thread
    
    Design decisions:
    - Thread ID matches parent message ID (1:1 relationship)
    - Replies are ordered chronologically
    - Thread can be "followed" for notifications even without participating
    """
    
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    
    # Parent message that started the thread
    parent_message_id: str = ""
    channel_id: str = ""
    
    # Thread state
    reply_count: int = 0
    participant_ids: set[str] = field(default_factory=set)
    follower_ids: set[str] = field(default_factory=set)  # Watching but not replied
    
    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    last_reply_at: Optional[datetime] = None
    
    # Replies (in-memory storage)
    _replies: list[Message] = field(default_factory=list, repr=False)
    
    @property
    def is_active(self) -> bool:
        """Check if thread has any replies."""
        return self.reply_count > 0
    
    @property
    def participants(self) -> list[str]:
        """Get list of participant IDs."""
        return list(self.participant_ids)
    
    def add_reply(self, message: Message) -> Message:
        """
        Add a reply to the thread.
        
        Updates the message to reference this thread and tracks participation.
        """
        message.thread_id = self.id
        message.channel_id = self.channel_id
        
        self._replies.append(message)
        self.reply_count += 1
        self.last_reply_at = message.created_at
        self.participant_ids.add(message.sender_id)
        
        return message
    
    def get_replies(
        self,
        limit: int = 100,
        before: Optional[datetime] = None,
        after: Optional[datetime] = None,
    ) -> list[Message]:
        """
        Get replies in the thread.
        
        Returns replies in chronological order.
        """
        replies = self._replies
        
        if after:
            replies = [r for r in replies if r.created_at > after]
        if before:
            replies = [r for r in replies if r.created_at < before]
        
        replies = sorted(replies, key=lambda m: m.created_at)
        return replies[:limit]
    
    def follow(self, agent_id: str) -> bool:
        """
        Follow a thread for notifications.
        
        Followers get notified of new replies without having to participate.
        """
        if agent_id not in self.follower_ids:
            self.follower_ids.add(agent_id)
            return True
        return False
    
    def unfollow(self, agent_id: str) -> bool:
        """Stop following a thread."""
        if agent_id in self.follower_ids:
            self.follower_ids.remove(agent_id)
            return True
        return False
    
    def should_notify(self, agent_id: str) -> bool:
        """Check if an agent should be notified of thread activity."""
        return agent_id in self.participant_ids or agent_id in self.follower_ids
    
    def get_context(self, include_parent: bool = True) -> dict:
        """
        Get thread context for an agent catching up.
        
        Returns summary information about the thread.
        """
        return {
            "thread_id": self.id,
            "parent_message_id": self.parent_message_id,
            "channel_id": self.channel_id,
            "reply_count": self.reply_count,
            "participant_count": len(self.participant_ids),
            "participants": list(self.participant_ids),
            "last_reply_at": self.last_reply_at.isoformat() if self.last_reply_at else None,
        }
    
    def to_dict(self) -> dict:
        """Serialize thread to dictionary."""
        return {
            "id": self.id,
            "parent_message_id": self.parent_message_id,
            "channel_id": self.channel_id,
            "reply_count": self.reply_count,
            "participants": list(self.participant_ids),
            "followers": list(self.follower_ids),
            "created_at": self.created_at.isoformat(),
            "last_reply_at": self.last_reply_at.isoformat() if self.last_reply_at else None,
        }
    
    def __str__(self) -> str:
        """Human-readable representation."""
        return f"Thread({self.id[:8]}): {self.reply_count} replies, {len(self.participant_ids)} participants"
    
    def __iter__(self) -> Iterator[Message]:
        """Iterate over replies."""
        return iter(self._replies)


class ThreadManager:
    """
    Manages threads within a channel.
    
    This is typically owned by a Channel or Workspace to handle thread
    creation and lookup.
    """
    
    def __init__(self):
        self._threads: dict[str, Thread] = {}  # thread_id -> Thread
        self._message_threads: dict[str, str] = {}  # message_id -> thread_id
    
    def get_or_create_thread(self, parent_message: Message) -> Thread:
        """
        Get existing thread or create new one for a message.
        
        Thread ID matches the parent message ID for easy lookup.
        """
        if parent_message.id in self._message_threads:
            thread_id = self._message_threads[parent_message.id]
            return self._threads[thread_id]
        
        thread = Thread(
            id=parent_message.id,  # Thread ID = Parent message ID
            parent_message_id=parent_message.id,
            channel_id=parent_message.channel_id,
        )
        
        # Parent message author is first participant
        thread.participant_ids.add(parent_message.sender_id)
        
        self._threads[thread.id] = thread
        self._message_threads[parent_message.id] = thread.id
        
        return thread
    
    def get_thread(self, thread_id: str) -> Optional[Thread]:
        """Get a thread by ID."""
        return self._threads.get(thread_id)
    
    def get_thread_for_message(self, message_id: str) -> Optional[Thread]:
        """Get the thread associated with a message."""
        thread_id = self._message_threads.get(message_id)
        if thread_id:
            return self._threads.get(thread_id)
        return None
    
    def list_threads(
        self,
        channel_id: Optional[str] = None,
        active_only: bool = False,
    ) -> list[Thread]:
        """List all threads, optionally filtered."""
        threads = list(self._threads.values())
        
        if channel_id:
            threads = [t for t in threads if t.channel_id == channel_id]
        
        if active_only:
            threads = [t for t in threads if t.is_active]
        
        return sorted(threads, key=lambda t: t.last_reply_at or t.created_at, reverse=True)
