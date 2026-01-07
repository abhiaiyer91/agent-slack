"""Terminal session API routes."""

from fastapi import APIRouter, HTTPException, status

from app.models.session import (
    TerminalResize,
    TerminalSession,
    TerminalSessionCreate,
)
from app.services.terminal import TerminalError, get_terminal_service

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=TerminalSession, status_code=status.HTTP_201_CREATED)
async def create_session(request: TerminalSessionCreate):
    """Create a new terminal session."""
    try:
        service = get_terminal_service()
        session = await service.create_session(request)
        return session
    except TerminalError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("", response_model=list[TerminalSession])
async def list_sessions(workspace_id: str | None = None):
    """List all terminal sessions."""
    service = get_terminal_service()
    sessions = await service.list_sessions(workspace_id)
    return sessions


@router.get("/{session_id}", response_model=TerminalSession)
async def get_session(session_id: str):
    """Get a session by ID."""
    service = get_terminal_service()
    session = await service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session not found: {session_id}",
        )
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def close_session(session_id: str):
    """Close a terminal session."""
    service = get_terminal_service()
    success = await service.close_session(session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session not found: {session_id}",
        )


@router.post("/{session_id}/resize", response_model=TerminalSession)
async def resize_session(session_id: str, request: TerminalResize):
    """Resize a terminal session."""
    service = get_terminal_service()
    try:
        await service.resize_terminal(session_id, request.cols, request.rows)
        session = await service.get_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session not found: {session_id}",
            )
        return session
    except TerminalError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/{session_id}/context")
async def get_terminal_context(session_id: str, max_bytes: int = 10000):
    """Get recent terminal output for AI context."""
    service = get_terminal_service()
    session = await service.get_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session not found: {session_id}",
        )
    
    context = service.get_terminal_context(session_id, max_bytes)
    return {"context": context}
