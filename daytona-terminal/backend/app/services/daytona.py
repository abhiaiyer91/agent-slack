"""Daytona SDK wrapper for workspace management."""

import asyncio
import uuid
from datetime import datetime
from typing import Any, Optional

import httpx

from app.core.config import settings
from app.core.logging import logger
from app.models.workspace import (
    Workspace,
    WorkspaceCreate,
    WorkspaceStatus,
    WorkspaceUpdate,
)


class DaytonaError(Exception):
    """Exception raised for Daytona API errors."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class DaytonaService:
    """
    Service for interacting with Daytona.io API.
    
    This provides a high-level interface for:
    - Creating and managing workspaces
    - Executing commands in workspaces
    - Managing workspace lifecycle
    """

    def __init__(self):
        self.api_url = settings.daytona_api_url.rstrip("/")
        self.api_key = settings.daytona_api_key
        self._client: Optional[httpx.AsyncClient] = None
        
        # In-memory workspace storage (replace with DB in production)
        self._workspaces: dict[str, Workspace] = {}

    @property
    def client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.api_url,
                headers=self._get_headers(),
                timeout=30.0,
            )
        return self._client

    def _get_headers(self) -> dict[str, str]:
        """Get headers for API requests."""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    # =========================================================================
    # Workspace Management
    # =========================================================================

    async def create_workspace(self, request: WorkspaceCreate) -> Workspace:
        """
        Create a new Daytona workspace.
        
        Args:
            request: Workspace creation request
            
        Returns:
            Created workspace instance
        """
        workspace_id = str(uuid.uuid4())
        
        logger.info(f"Creating workspace: {request.name} (ID: {workspace_id})")
        
        # Build workspace configuration
        workspace = Workspace(
            id=workspace_id,
            name=request.name,
            status=WorkspaceStatus.CREATING,
            repository_url=request.repository_url,
            branch=request.branch or "main",
            image=request.image or settings.daytona_default_image,
            ai_assistant=request.ai_assistant,
            metadata={
                "env_vars": request.env_vars,
                "dotfiles_url": request.dotfiles_url,
            },
        )
        
        # If Daytona API is configured, create via API
        if self.api_key:
            try:
                workspace = await self._create_workspace_via_api(request, workspace_id)
            except Exception as e:
                logger.error(f"Failed to create workspace via Daytona API: {e}")
                workspace.status = WorkspaceStatus.ERROR
                workspace.metadata["error"] = str(e)
        else:
            # Local/mock mode - simulate workspace creation
            logger.info("Running in local mode (no Daytona API key)")
            await self._simulate_workspace_creation(workspace)
        
        # Store workspace
        self._workspaces[workspace_id] = workspace
        
        return workspace

    async def _create_workspace_via_api(
        self, request: WorkspaceCreate, workspace_id: str
    ) -> Workspace:
        """Create workspace via Daytona API."""
        payload = {
            "id": workspace_id,
            "name": request.name,
            "target": "local",  # or "docker", "kubernetes"
            "projects": [
                {
                    "name": request.name,
                    "repository": {
                        "url": request.repository_url,
                        "branch": request.branch,
                    }
                    if request.repository_url
                    else None,
                    "image": request.image or settings.daytona_default_image,
                    "envVars": request.env_vars,
                }
            ],
        }
        
        response = await self.client.post("/workspace", json=payload)
        
        if response.status_code not in (200, 201):
            raise DaytonaError(
                f"Failed to create workspace: {response.text}",
                status_code=response.status_code,
            )
        
        data = response.json()
        
        return Workspace(
            id=data.get("id", workspace_id),
            name=data.get("name", request.name),
            status=WorkspaceStatus.CREATING,
            repository_url=request.repository_url,
            branch=request.branch,
            image=request.image or settings.daytona_default_image,
            ssh_host=data.get("sshHost"),
            ssh_port=data.get("sshPort"),
            ssh_user=data.get("sshUser", "daytona"),
            ide_url=data.get("ideUrl"),
            ai_assistant=request.ai_assistant,
        )

    async def _simulate_workspace_creation(self, workspace: Workspace):
        """Simulate workspace creation for local development."""
        # Simulate creation delay
        await asyncio.sleep(0.5)
        
        workspace.status = WorkspaceStatus.RUNNING
        workspace.ssh_host = "localhost"
        workspace.ssh_port = 2222
        workspace.ssh_user = "daytona"
        workspace.cpu_cores = 4
        workspace.memory_gb = 8.0
        workspace.disk_gb = 50.0

    async def get_workspace(self, workspace_id: str) -> Optional[Workspace]:
        """Get a workspace by ID."""
        # Check local cache first
        if workspace_id in self._workspaces:
            workspace = self._workspaces[workspace_id]
            
            # Refresh status from API if available
            if self.api_key:
                try:
                    workspace = await self._get_workspace_from_api(workspace_id)
                    self._workspaces[workspace_id] = workspace
                except Exception as e:
                    logger.warning(f"Failed to refresh workspace status: {e}")
            
            return workspace
        
        # Try to fetch from API
        if self.api_key:
            try:
                workspace = await self._get_workspace_from_api(workspace_id)
                self._workspaces[workspace_id] = workspace
                return workspace
            except Exception:
                pass
        
        return None

    async def _get_workspace_from_api(self, workspace_id: str) -> Workspace:
        """Get workspace details from Daytona API."""
        response = await self.client.get(f"/workspace/{workspace_id}")
        
        if response.status_code == 404:
            raise DaytonaError("Workspace not found", status_code=404)
        
        if response.status_code != 200:
            raise DaytonaError(
                f"Failed to get workspace: {response.text}",
                status_code=response.status_code,
            )
        
        data = response.json()
        
        # Map API status to our status enum
        api_status = data.get("state", "unknown").lower()
        status_map = {
            "uninitialized": WorkspaceStatus.PENDING,
            "initializing": WorkspaceStatus.CREATING,
            "starting": WorkspaceStatus.STARTING,
            "running": WorkspaceStatus.RUNNING,
            "stopping": WorkspaceStatus.STOPPING,
            "stopped": WorkspaceStatus.STOPPED,
            "error": WorkspaceStatus.ERROR,
        }
        status = status_map.get(api_status, WorkspaceStatus.ERROR)
        
        return Workspace(
            id=data.get("id", workspace_id),
            name=data.get("name", ""),
            status=status,
            ssh_host=data.get("sshHost"),
            ssh_port=data.get("sshPort"),
            ssh_user=data.get("sshUser", "daytona"),
            ide_url=data.get("ideUrl"),
        )

    async def list_workspaces(
        self, page: int = 1, per_page: int = 20
    ) -> tuple[list[Workspace], int]:
        """List all workspaces."""
        if self.api_key:
            try:
                response = await self.client.get(
                    "/workspace",
                    params={"page": page, "perPage": per_page},
                )
                
                if response.status_code == 200:
                    data = response.json()
                    workspaces = [
                        await self._get_workspace_from_api(w["id"])
                        for w in data.get("workspaces", [])
                    ]
                    return workspaces, data.get("total", len(workspaces))
            except Exception as e:
                logger.warning(f"Failed to list workspaces from API: {e}")
        
        # Return from local cache
        all_workspaces = list(self._workspaces.values())
        start = (page - 1) * per_page
        end = start + per_page
        return all_workspaces[start:end], len(all_workspaces)

    async def update_workspace(
        self, workspace_id: str, request: WorkspaceUpdate
    ) -> Optional[Workspace]:
        """Update a workspace."""
        workspace = await self.get_workspace(workspace_id)
        if not workspace:
            return None
        
        if request.name:
            workspace.name = request.name
        if request.env_vars:
            workspace.metadata["env_vars"] = {
                **workspace.metadata.get("env_vars", {}),
                **request.env_vars,
            }
        
        workspace.updated_at = datetime.utcnow()
        self._workspaces[workspace_id] = workspace
        
        return workspace

    async def delete_workspace(self, workspace_id: str) -> bool:
        """Delete a workspace."""
        if workspace_id not in self._workspaces:
            return False
        
        logger.info(f"Deleting workspace: {workspace_id}")
        
        if self.api_key:
            try:
                response = await self.client.delete(f"/workspace/{workspace_id}")
                if response.status_code not in (200, 204, 404):
                    raise DaytonaError(
                        f"Failed to delete workspace: {response.text}",
                        status_code=response.status_code,
                    )
            except DaytonaError:
                raise
            except Exception as e:
                logger.error(f"Failed to delete workspace via API: {e}")
        
        workspace = self._workspaces[workspace_id]
        workspace.status = WorkspaceStatus.DELETED
        del self._workspaces[workspace_id]
        
        return True

    async def start_workspace(self, workspace_id: str) -> Optional[Workspace]:
        """Start a stopped workspace."""
        workspace = await self.get_workspace(workspace_id)
        if not workspace:
            return None
        
        if workspace.status == WorkspaceStatus.RUNNING:
            return workspace
        
        logger.info(f"Starting workspace: {workspace_id}")
        
        if self.api_key:
            try:
                response = await self.client.post(f"/workspace/{workspace_id}/start")
                if response.status_code not in (200, 202):
                    raise DaytonaError(
                        f"Failed to start workspace: {response.text}",
                        status_code=response.status_code,
                    )
            except Exception as e:
                logger.error(f"Failed to start workspace via API: {e}")
                workspace.status = WorkspaceStatus.ERROR
                return workspace
        
        workspace.status = WorkspaceStatus.STARTING
        
        # Simulate startup in local mode
        if not self.api_key:
            await asyncio.sleep(0.5)
            workspace.status = WorkspaceStatus.RUNNING
        
        self._workspaces[workspace_id] = workspace
        return workspace

    async def stop_workspace(self, workspace_id: str) -> Optional[Workspace]:
        """Stop a running workspace."""
        workspace = await self.get_workspace(workspace_id)
        if not workspace:
            return None
        
        if workspace.status == WorkspaceStatus.STOPPED:
            return workspace
        
        logger.info(f"Stopping workspace: {workspace_id}")
        
        if self.api_key:
            try:
                response = await self.client.post(f"/workspace/{workspace_id}/stop")
                if response.status_code not in (200, 202):
                    raise DaytonaError(
                        f"Failed to stop workspace: {response.text}",
                        status_code=response.status_code,
                    )
            except Exception as e:
                logger.error(f"Failed to stop workspace via API: {e}")
        
        workspace.status = WorkspaceStatus.STOPPING
        
        # Simulate stop in local mode
        if not self.api_key:
            await asyncio.sleep(0.3)
            workspace.status = WorkspaceStatus.STOPPED
        
        self._workspaces[workspace_id] = workspace
        return workspace

    # =========================================================================
    # Command Execution
    # =========================================================================

    async def execute_command(
        self,
        workspace_id: str,
        command: str,
        working_dir: Optional[str] = None,
        env_vars: Optional[dict[str, str]] = None,
        timeout: int = 60,
    ) -> tuple[str, int]:
        """
        Execute a command in a workspace.
        
        Args:
            workspace_id: Workspace to execute in
            command: Command to execute
            working_dir: Working directory
            env_vars: Additional environment variables
            timeout: Command timeout in seconds
            
        Returns:
            Tuple of (output, exit_code)
        """
        workspace = await self.get_workspace(workspace_id)
        if not workspace:
            raise DaytonaError(f"Workspace not found: {workspace_id}")
        
        if workspace.status != WorkspaceStatus.RUNNING:
            raise DaytonaError(f"Workspace is not running: {workspace.status}")
        
        logger.debug(f"Executing command in {workspace_id}: {command}")
        
        if self.api_key:
            return await self._execute_via_api(
                workspace_id, command, working_dir, env_vars, timeout
            )
        else:
            # Local execution simulation
            return await self._execute_local(command, working_dir, env_vars, timeout)

    async def _execute_via_api(
        self,
        workspace_id: str,
        command: str,
        working_dir: Optional[str],
        env_vars: Optional[dict[str, str]],
        timeout: int,
    ) -> tuple[str, int]:
        """Execute command via Daytona API."""
        payload = {
            "command": command,
            "workingDir": working_dir,
            "envVars": env_vars or {},
            "timeout": timeout,
        }
        
        response = await self.client.post(
            f"/workspace/{workspace_id}/exec",
            json=payload,
            timeout=timeout + 5,
        )
        
        if response.status_code != 200:
            raise DaytonaError(
                f"Command execution failed: {response.text}",
                status_code=response.status_code,
            )
        
        data = response.json()
        return data.get("output", ""), data.get("exitCode", 0)

    async def _execute_local(
        self,
        command: str,
        working_dir: Optional[str],
        env_vars: Optional[dict[str, str]],
        timeout: int,
    ) -> tuple[str, int]:
        """Execute command locally (for testing)."""
        import os
        import subprocess
        
        env = os.environ.copy()
        if env_vars:
            env.update(env_vars)
        
        try:
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=working_dir,
                env=env,
            )
            output = result.stdout + result.stderr
            return output, result.returncode
        except subprocess.TimeoutExpired:
            return "Command timed out", 124
        except Exception as e:
            return str(e), 1


# Singleton instance
_daytona_service: Optional[DaytonaService] = None


def get_daytona_service() -> DaytonaService:
    """Get the Daytona service singleton."""
    global _daytona_service
    if _daytona_service is None:
        _daytona_service = DaytonaService()
    return _daytona_service
