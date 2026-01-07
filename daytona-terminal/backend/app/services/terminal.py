"""Terminal service for managing PTY sessions over WebSocket."""

import asyncio
import os
import pty
import select
import struct
import subprocess
import termios
import uuid
from datetime import datetime
from typing import Any, Callable, Optional

import asyncssh

from app.core.config import settings
from app.core.logging import logger
from app.models.session import SessionStatus, TerminalSession, TerminalSessionCreate
from app.models.workspace import Workspace, WorkspaceStatus
from app.services.daytona import DaytonaService, get_daytona_service


class TerminalError(Exception):
    """Exception raised for terminal errors."""
    pass


class PTYProcess:
    """Manages a local PTY process."""

    def __init__(
        self,
        shell: str = "/bin/bash",
        cols: int = 120,
        rows: int = 40,
        env: Optional[dict[str, str]] = None,
        cwd: Optional[str] = None,
    ):
        self.shell = shell
        self.cols = cols
        self.rows = rows
        self.env = env or {}
        self.cwd = cwd
        
        self.master_fd: Optional[int] = None
        self.slave_fd: Optional[int] = None
        self.pid: Optional[int] = None
        self._closed = False

    def spawn(self) -> int:
        """Spawn the PTY process."""
        # Open a new PTY
        self.master_fd, self.slave_fd = pty.openpty()
        
        # Set terminal size
        self._set_size(self.cols, self.rows)
        
        # Fork the process
        self.pid = os.fork()
        
        if self.pid == 0:
            # Child process
            os.setsid()
            os.dup2(self.slave_fd, 0)
            os.dup2(self.slave_fd, 1)
            os.dup2(self.slave_fd, 2)
            
            if self.slave_fd > 2:
                os.close(self.slave_fd)
            
            # Set environment
            env = os.environ.copy()
            env.update(self.env)
            env["TERM"] = "xterm-256color"
            env["COLORTERM"] = "truecolor"
            
            # Change directory if specified
            if self.cwd:
                os.chdir(self.cwd)
            
            # Execute shell
            os.execvpe(self.shell, [self.shell], env)
        else:
            # Parent process
            os.close(self.slave_fd)
            return self.master_fd

    def _set_size(self, cols: int, rows: int):
        """Set the terminal size."""
        if self.master_fd is not None:
            winsize = struct.pack("HHHH", rows, cols, 0, 0)
            import fcntl
            fcntl.ioctl(self.master_fd, termios.TIOCSWINSZ, winsize)
            self.cols = cols
            self.rows = rows

    def resize(self, cols: int, rows: int):
        """Resize the terminal."""
        self._set_size(cols, rows)

    def write(self, data: bytes):
        """Write data to the terminal."""
        if self.master_fd is not None and not self._closed:
            os.write(self.master_fd, data)

    def read(self, size: int = 1024) -> bytes:
        """Read data from the terminal."""
        if self.master_fd is None or self._closed:
            return b""
        
        try:
            if select.select([self.master_fd], [], [], 0)[0]:
                return os.read(self.master_fd, size)
        except OSError:
            pass
        return b""

    async def read_async(self, size: int = 1024) -> bytes:
        """Async read from terminal."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.read, size)

    def close(self):
        """Close the PTY process."""
        if self._closed:
            return
        
        self._closed = True
        
        if self.master_fd is not None:
            try:
                os.close(self.master_fd)
            except OSError:
                pass
        
        if self.pid is not None:
            try:
                os.kill(self.pid, 9)
                os.waitpid(self.pid, 0)
            except OSError:
                pass

    @property
    def is_alive(self) -> bool:
        """Check if the process is still alive."""
        if self.pid is None or self._closed:
            return False
        try:
            os.kill(self.pid, 0)
            return True
        except OSError:
            return False


class SSHTerminal:
    """Manages an SSH terminal connection to a Daytona workspace."""

    def __init__(
        self,
        host: str,
        port: int = 22,
        username: str = "daytona",
        shell: str = "/bin/bash",
        cols: int = 120,
        rows: int = 40,
        env: Optional[dict[str, str]] = None,
    ):
        self.host = host
        self.port = port
        self.username = username
        self.shell = shell
        self.cols = cols
        self.rows = rows
        self.env = env or {}
        
        self._conn: Optional[asyncssh.SSHClientConnection] = None
        self._process: Optional[asyncssh.SSHClientProcess] = None
        self._closed = False

    async def connect(self):
        """Establish SSH connection and start terminal."""
        logger.info(f"Connecting to SSH: {self.username}@{self.host}:{self.port}")
        
        try:
            self._conn = await asyncssh.connect(
                self.host,
                port=self.port,
                username=self.username,
                known_hosts=None,  # Disable host key checking for dev
            )
            
            # Start interactive shell
            self._process = await self._conn.create_process(
                self.shell,
                term_type="xterm-256color",
                term_size=(self.cols, self.rows),
                env=self.env,
            )
            
            logger.info("SSH terminal connected")
        except Exception as e:
            logger.error(f"SSH connection failed: {e}")
            raise TerminalError(f"SSH connection failed: {e}")

    async def write(self, data: bytes):
        """Write data to the terminal."""
        if self._process and not self._closed:
            self._process.stdin.write(data.decode("utf-8", errors="replace"))

    async def read(self) -> bytes:
        """Read data from the terminal."""
        if self._process and not self._closed:
            try:
                data = await asyncio.wait_for(
                    self._process.stdout.read(1024),
                    timeout=0.1,
                )
                return data.encode("utf-8") if data else b""
            except asyncio.TimeoutError:
                pass
        return b""

    def resize(self, cols: int, rows: int):
        """Resize the terminal."""
        if self._process:
            self._process.change_terminal_size(cols, rows)
            self.cols = cols
            self.rows = rows

    async def close(self):
        """Close the SSH connection."""
        self._closed = True
        if self._process:
            self._process.close()
        if self._conn:
            self._conn.close()
            await self._conn.wait_closed()


class TerminalService:
    """
    Service for managing terminal sessions.
    
    Provides:
    - Session lifecycle management
    - PTY/SSH terminal connections
    - Terminal I/O handling
    """

    def __init__(self, daytona_service: Optional[DaytonaService] = None):
        self.daytona = daytona_service or get_daytona_service()
        self._sessions: dict[str, TerminalSession] = {}
        self._terminals: dict[str, PTYProcess | SSHTerminal] = {}
        self._output_buffers: dict[str, list[bytes]] = {}
        self._read_tasks: dict[str, asyncio.Task] = {}

    async def create_session(self, request: TerminalSessionCreate) -> TerminalSession:
        """
        Create a new terminal session.
        
        Args:
            request: Session creation request
            
        Returns:
            Created terminal session
        """
        session_id = str(uuid.uuid4())
        
        logger.info(f"Creating terminal session: {session_id}")
        
        # Get workspace
        workspace = await self.daytona.get_workspace(request.workspace_id)
        if not workspace:
            raise TerminalError(f"Workspace not found: {request.workspace_id}")
        
        # Create session
        session = TerminalSession(
            id=session_id,
            workspace_id=request.workspace_id,
            status=SessionStatus.CONNECTING,
            shell=request.shell or settings.terminal_default_shell,
            cols=request.cols or settings.terminal_default_cols,
            rows=request.rows or settings.terminal_default_rows,
            working_directory=request.working_directory,
            websocket_url=f"/ws/terminal/{session_id}",
        )
        
        # Create terminal connection
        try:
            terminal = await self._create_terminal(workspace, session, request.env_vars)
            self._terminals[session_id] = terminal
            session.status = SessionStatus.CONNECTED
        except Exception as e:
            logger.error(f"Failed to create terminal: {e}")
            session.status = SessionStatus.ERROR
            raise TerminalError(f"Failed to create terminal: {e}")
        
        # Initialize output buffer
        self._output_buffers[session_id] = []
        
        # Store session
        self._sessions[session_id] = session
        
        return session

    async def _create_terminal(
        self,
        workspace: Workspace,
        session: TerminalSession,
        env_vars: Optional[dict[str, str]] = None,
    ) -> PTYProcess | SSHTerminal:
        """Create the appropriate terminal type."""
        env = env_vars or {}
        
        # Add AI assistant environment variables if configured
        if workspace.ai_assistant:
            if settings.anthropic_api_key:
                env["ANTHROPIC_API_KEY"] = settings.anthropic_api_key
            if settings.openai_api_key:
                env["OPENAI_API_KEY"] = settings.openai_api_key
        
        # Use SSH if workspace has SSH details, otherwise local PTY
        if workspace.ssh_host and workspace.ssh_port:
            terminal = SSHTerminal(
                host=workspace.ssh_host,
                port=workspace.ssh_port,
                username=workspace.ssh_user or "daytona",
                shell=session.shell,
                cols=session.cols,
                rows=session.rows,
                env=env,
            )
            await terminal.connect()
            return terminal
        else:
            # Local PTY for development/testing
            terminal = PTYProcess(
                shell=session.shell,
                cols=session.cols,
                rows=session.rows,
                env=env,
                cwd=session.working_directory,
            )
            terminal.spawn()
            return terminal

    async def get_session(self, session_id: str) -> Optional[TerminalSession]:
        """Get a session by ID."""
        return self._sessions.get(session_id)

    async def list_sessions(
        self, workspace_id: Optional[str] = None
    ) -> list[TerminalSession]:
        """List all sessions, optionally filtered by workspace."""
        sessions = list(self._sessions.values())
        if workspace_id:
            sessions = [s for s in sessions if s.workspace_id == workspace_id]
        return sessions

    async def close_session(self, session_id: str) -> bool:
        """Close a terminal session."""
        if session_id not in self._sessions:
            return False
        
        logger.info(f"Closing terminal session: {session_id}")
        
        # Stop read task
        if session_id in self._read_tasks:
            self._read_tasks[session_id].cancel()
            try:
                await self._read_tasks[session_id]
            except asyncio.CancelledError:
                pass
            del self._read_tasks[session_id]
        
        # Close terminal
        if session_id in self._terminals:
            terminal = self._terminals[session_id]
            if isinstance(terminal, PTYProcess):
                terminal.close()
            else:
                await terminal.close()
            del self._terminals[session_id]
        
        # Update session status
        session = self._sessions[session_id]
        session.status = SessionStatus.DISCONNECTED
        
        # Clean up
        if session_id in self._output_buffers:
            del self._output_buffers[session_id]
        
        del self._sessions[session_id]
        
        return True

    async def write_to_terminal(self, session_id: str, data: bytes):
        """Write data to a terminal."""
        if session_id not in self._terminals:
            raise TerminalError(f"Terminal not found: {session_id}")
        
        terminal = self._terminals[session_id]
        
        if isinstance(terminal, PTYProcess):
            terminal.write(data)
        else:
            await terminal.write(data)
        
        # Update last activity
        if session_id in self._sessions:
            self._sessions[session_id].last_activity_at = datetime.utcnow()

    async def read_from_terminal(self, session_id: str) -> bytes:
        """Read data from a terminal."""
        if session_id not in self._terminals:
            raise TerminalError(f"Terminal not found: {session_id}")
        
        terminal = self._terminals[session_id]
        
        if isinstance(terminal, PTYProcess):
            data = await terminal.read_async()
        else:
            data = await terminal.read()
        
        # Store in buffer for context
        if data and session_id in self._output_buffers:
            self._output_buffers[session_id].append(data)
            # Keep last 100KB of output
            total_size = sum(len(d) for d in self._output_buffers[session_id])
            while total_size > 100 * 1024 and self._output_buffers[session_id]:
                removed = self._output_buffers[session_id].pop(0)
                total_size -= len(removed)
        
        return data

    async def resize_terminal(self, session_id: str, cols: int, rows: int):
        """Resize a terminal."""
        if session_id not in self._terminals:
            raise TerminalError(f"Terminal not found: {session_id}")
        
        terminal = self._terminals[session_id]
        terminal.resize(cols, rows)
        
        if session_id in self._sessions:
            self._sessions[session_id].cols = cols
            self._sessions[session_id].rows = rows

    def get_terminal_context(self, session_id: str, max_bytes: int = 10000) -> str:
        """Get recent terminal output for AI context."""
        if session_id not in self._output_buffers:
            return ""
        
        buffer = self._output_buffers[session_id]
        if not buffer:
            return ""
        
        # Get last max_bytes of output
        result = b""
        for chunk in reversed(buffer):
            if len(result) + len(chunk) > max_bytes:
                break
            result = chunk + result
        
        return result.decode("utf-8", errors="replace")

    async def start_read_loop(
        self, session_id: str, callback: Callable[[bytes], Any]
    ) -> asyncio.Task:
        """Start a read loop for the terminal."""
        async def read_loop():
            while session_id in self._sessions:
                try:
                    data = await self.read_from_terminal(session_id)
                    if data:
                        await callback(data)
                    else:
                        await asyncio.sleep(0.01)  # Prevent busy loop
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Read loop error: {e}")
                    await asyncio.sleep(0.1)
        
        task = asyncio.create_task(read_loop())
        self._read_tasks[session_id] = task
        return task


# Singleton instance
_terminal_service: Optional[TerminalService] = None


def get_terminal_service() -> TerminalService:
    """Get the terminal service singleton."""
    global _terminal_service
    if _terminal_service is None:
        _terminal_service = TerminalService()
    return _terminal_service
