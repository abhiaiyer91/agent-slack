"""Workspace API routes."""

from fastapi import APIRouter, HTTPException, status

from app.models.workspace import (
    Workspace,
    WorkspaceCreate,
    WorkspaceList,
    WorkspaceUpdate,
)
from app.services.daytona import DaytonaError, get_daytona_service

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.post("", response_model=Workspace, status_code=status.HTTP_201_CREATED)
async def create_workspace(request: WorkspaceCreate):
    """Create a new Daytona workspace."""
    try:
        service = get_daytona_service()
        workspace = await service.create_workspace(request)
        return workspace
    except DaytonaError as e:
        raise HTTPException(
            status_code=e.status_code or status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )


@router.get("", response_model=WorkspaceList)
async def list_workspaces(page: int = 1, per_page: int = 20):
    """List all workspaces."""
    service = get_daytona_service()
    workspaces, total = await service.list_workspaces(page, per_page)
    return WorkspaceList(
        workspaces=workspaces,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{workspace_id}", response_model=Workspace)
async def get_workspace(workspace_id: str):
    """Get a workspace by ID."""
    service = get_daytona_service()
    workspace = await service.get_workspace(workspace_id)
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace not found: {workspace_id}",
        )
    return workspace


@router.patch("/{workspace_id}", response_model=Workspace)
async def update_workspace(workspace_id: str, request: WorkspaceUpdate):
    """Update a workspace."""
    service = get_daytona_service()
    workspace = await service.update_workspace(workspace_id, request)
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workspace not found: {workspace_id}",
        )
    return workspace


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(workspace_id: str):
    """Delete a workspace."""
    service = get_daytona_service()
    try:
        success = await service.delete_workspace(workspace_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace not found: {workspace_id}",
            )
    except DaytonaError as e:
        raise HTTPException(
            status_code=e.status_code or status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )


@router.post("/{workspace_id}/start", response_model=Workspace)
async def start_workspace(workspace_id: str):
    """Start a stopped workspace."""
    service = get_daytona_service()
    try:
        workspace = await service.start_workspace(workspace_id)
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace not found: {workspace_id}",
            )
        return workspace
    except DaytonaError as e:
        raise HTTPException(
            status_code=e.status_code or status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )


@router.post("/{workspace_id}/stop", response_model=Workspace)
async def stop_workspace(workspace_id: str):
    """Stop a running workspace."""
    service = get_daytona_service()
    try:
        workspace = await service.stop_workspace(workspace_id)
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workspace not found: {workspace_id}",
            )
        return workspace
    except DaytonaError as e:
        raise HTTPException(
            status_code=e.status_code or status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )


@router.post("/{workspace_id}/exec")
async def execute_command(
    workspace_id: str,
    command: str,
    working_dir: str | None = None,
    timeout: int = 60,
):
    """Execute a command in a workspace."""
    service = get_daytona_service()
    try:
        output, exit_code = await service.execute_command(
            workspace_id,
            command,
            working_dir=working_dir,
            timeout=timeout,
        )
        return {"output": output, "exit_code": exit_code}
    except DaytonaError as e:
        raise HTTPException(
            status_code=e.status_code or status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=e.message,
        )
