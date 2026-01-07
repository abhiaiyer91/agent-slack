#!/usr/bin/env python3
"""
Daytona Terminal CLI - Command-line interface for Daytona Terminal.

This CLI provides direct terminal access to Daytona workspaces
with AI assistant integration.
"""

import asyncio
import json
import os
import sys
import signal
import termios
import tty
from typing import Optional

import httpx
import typer
import websockets
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.live import Live
from rich.markdown import Markdown

app = typer.Typer(
    name="daytona-terminal",
    help="Feature-rich terminal for Daytona.io with AI assistant support",
    add_completion=True,
)

console = Console()

# Configuration
API_URL = os.getenv("DAYTONA_TERMINAL_API_URL", "http://localhost:8000")
WS_URL = os.getenv("DAYTONA_TERMINAL_WS_URL", "ws://localhost:8000")


def get_client() -> httpx.Client:
    """Get HTTP client for API requests."""
    return httpx.Client(base_url=f"{API_URL}/api/v1", timeout=30.0)


def get_async_client() -> httpx.AsyncClient:
    """Get async HTTP client for API requests."""
    return httpx.AsyncClient(base_url=f"{API_URL}/api/v1", timeout=30.0)


# =============================================================================
# Workspace Commands
# =============================================================================


@app.command("list")
def list_workspaces():
    """List all workspaces."""
    with get_client() as client:
        response = client.get("/workspaces")
        response.raise_for_status()
        data = response.json()

    if not data["workspaces"]:
        console.print("[dim]No workspaces found[/dim]")
        return

    table = Table(title="Workspaces")
    table.add_column("ID", style="dim")
    table.add_column("Name", style="bold")
    table.add_column("Status")
    table.add_column("Repository")
    table.add_column("AI Assistant")

    status_colors = {
        "running": "green",
        "stopped": "dim",
        "creating": "yellow",
        "starting": "yellow",
        "stopping": "yellow",
        "error": "red",
    }

    for ws in data["workspaces"]:
        status = ws["status"]
        color = status_colors.get(status, "white")
        table.add_row(
            ws["id"][:8] + "...",
            ws["name"],
            f"[{color}]{status}[/{color}]",
            ws.get("repository_url") or "-",
            ws.get("ai_assistant") or "-",
        )

    console.print(table)


@app.command("create")
def create_workspace(
    name: str = typer.Argument(..., help="Workspace name"),
    repo: Optional[str] = typer.Option(None, "--repo", "-r", help="Repository URL"),
    branch: Optional[str] = typer.Option(None, "--branch", "-b", help="Git branch"),
    ai: Optional[str] = typer.Option(
        None, "--ai", "-a", help="AI assistant (claude, openai)"
    ),
):
    """Create a new workspace."""
    with get_client() as client:
        payload = {
            "name": name,
            "repository_url": repo,
            "branch": branch,
            "ai_assistant": ai,
        }
        payload = {k: v for k, v in payload.items() if v is not None}

        with console.status(f"Creating workspace '{name}'..."):
            response = client.post("/workspaces", json=payload)
            response.raise_for_status()
            workspace = response.json()

    console.print(
        Panel(
            f"[green]✓[/green] Workspace created successfully!\n\n"
            f"[bold]ID:[/bold] {workspace['id']}\n"
            f"[bold]Name:[/bold] {workspace['name']}\n"
            f"[bold]Status:[/bold] {workspace['status']}",
            title="Workspace Created",
        )
    )


@app.command("delete")
def delete_workspace(
    workspace_id: str = typer.Argument(..., help="Workspace ID"),
    force: bool = typer.Option(False, "--force", "-f", help="Skip confirmation"),
):
    """Delete a workspace."""
    if not force:
        confirm = typer.confirm(f"Delete workspace {workspace_id}?")
        if not confirm:
            raise typer.Abort()

    with get_client() as client:
        response = client.delete(f"/workspaces/{workspace_id}")
        response.raise_for_status()

    console.print(f"[green]✓[/green] Workspace deleted")


@app.command("start")
def start_workspace(workspace_id: str = typer.Argument(..., help="Workspace ID")):
    """Start a workspace."""
    with get_client() as client:
        with console.status("Starting workspace..."):
            response = client.post(f"/workspaces/{workspace_id}/start")
            response.raise_for_status()
            workspace = response.json()

    console.print(f"[green]✓[/green] Workspace {workspace['name']} is {workspace['status']}")


@app.command("stop")
def stop_workspace(workspace_id: str = typer.Argument(..., help="Workspace ID")):
    """Stop a workspace."""
    with get_client() as client:
        with console.status("Stopping workspace..."):
            response = client.post(f"/workspaces/{workspace_id}/stop")
            response.raise_for_status()
            workspace = response.json()

    console.print(f"[green]✓[/green] Workspace {workspace['name']} is {workspace['status']}")


# =============================================================================
# Terminal Commands
# =============================================================================


@app.command("connect")
def connect_terminal(
    workspace_id: str = typer.Argument(..., help="Workspace ID to connect to"),
    shell: Optional[str] = typer.Option(None, "--shell", "-s", help="Shell to use"),
):
    """Connect to a workspace terminal."""
    asyncio.run(_connect_terminal(workspace_id, shell))


async def _connect_terminal(workspace_id: str, shell: Optional[str]):
    """Async terminal connection handler."""
    async with get_async_client() as client:
        # Create session
        payload = {"workspace_id": workspace_id}
        if shell:
            payload["shell"] = shell

        response = await client.post("/sessions", json=payload)
        response.raise_for_status()
        session = response.json()

    session_id = session["id"]
    ws_url = f"{WS_URL}/ws/terminal/{session_id}"

    console.print(f"[dim]Connecting to session {session_id}...[/dim]")

    # Save terminal settings
    old_settings = termios.tcgetattr(sys.stdin)

    try:
        # Set terminal to raw mode
        tty.setraw(sys.stdin.fileno())

        async with websockets.connect(ws_url) as ws:
            # Handle signals
            def handle_resize(*args):
                import struct
                import fcntl
                
                # Get terminal size
                size = os.get_terminal_size()
                asyncio.create_task(
                    ws.send(
                        json.dumps(
                            {"type": "resize", "cols": size.columns, "rows": size.lines}
                        )
                    )
                )

            signal.signal(signal.SIGWINCH, handle_resize)

            # Send initial resize
            size = os.get_terminal_size()
            await ws.send(
                json.dumps({"type": "resize", "cols": size.columns, "rows": size.lines})
            )

            # Create tasks for reading from stdin and websocket
            async def read_stdin():
                loop = asyncio.get_event_loop()
                while True:
                    data = await loop.run_in_executor(None, sys.stdin.read, 1)
                    if data:
                        await ws.send(json.dumps({"type": "input", "data": data}))

            async def read_ws():
                async for message in ws:
                    try:
                        msg = json.loads(message)
                        if msg["type"] == "output":
                            sys.stdout.write(msg["data"])
                            sys.stdout.flush()
                        elif msg["type"] == "error":
                            print(f"\r\n[Error: {msg.get('message')}]\r\n", file=sys.stderr)
                        elif msg["type"] == "disconnected":
                            break
                    except json.JSONDecodeError:
                        pass

            # Run both tasks
            stdin_task = asyncio.create_task(read_stdin())
            ws_task = asyncio.create_task(read_ws())

            try:
                await asyncio.gather(stdin_task, ws_task)
            except asyncio.CancelledError:
                pass
            finally:
                stdin_task.cancel()
                ws_task.cancel()

    finally:
        # Restore terminal settings
        termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_settings)
        print("\r\n[Session ended]\r\n")


@app.command("exec")
def execute_command(
    workspace_id: str = typer.Argument(..., help="Workspace ID"),
    command: str = typer.Argument(..., help="Command to execute"),
):
    """Execute a command in a workspace."""
    with get_client() as client:
        response = client.post(
            f"/workspaces/{workspace_id}/exec",
            params={"command": command},
        )
        response.raise_for_status()
        result = response.json()

    console.print(result["output"])
    
    exit_code = result["exit_code"]
    if exit_code != 0:
        console.print(f"[red]Exit code: {exit_code}[/red]")
        raise typer.Exit(exit_code)


# =============================================================================
# AI Commands
# =============================================================================


@app.command("ai")
def ai_assistant(
    workspace_id: str = typer.Argument(..., help="Workspace ID"),
    assistant: str = typer.Option("claude", "--assistant", "-a", help="AI assistant type"),
):
    """Start an AI assistant session."""
    asyncio.run(_ai_session(workspace_id, assistant))


async def _ai_session(workspace_id: str, assistant_type: str):
    """Interactive AI assistant session."""
    async with get_async_client() as client:
        # Create terminal session
        response = await client.post("/sessions", json={"workspace_id": workspace_id})
        response.raise_for_status()
        session = response.json()
        session_id = session["id"]

        # Create AI conversation
        response = await client.post(
            f"/ai/conversations",
            params={"session_id": session_id, "assistant_type": assistant_type},
        )
        response.raise_for_status()
        conversation = response.json()

        console.print(
            Panel(
                f"AI Assistant ({assistant_type}) ready.\n"
                "Type your questions or commands. Type 'exit' to quit.",
                title="🤖 AI Session",
            )
        )

        while True:
            try:
                prompt = console.input("[bold cyan]You:[/bold cyan] ")
                
                if prompt.lower() in ("exit", "quit", "q"):
                    break

                if not prompt.strip():
                    continue

                # Get terminal context
                context_response = await client.get(
                    f"/sessions/{session_id}/context",
                    params={"max_bytes": 5000},
                )
                context = ""
                if context_response.status_code == 200:
                    context = context_response.json().get("context", "")

                # Send message
                with console.status("Thinking..."):
                    response = await client.post(
                        f"/ai/conversations/{conversation['id']}/message",
                        json={
                            "prompt": prompt,
                            "include_terminal_context": bool(context),
                        },
                    )
                    response.raise_for_status()
                    result = response.json()

                console.print("\n[bold green]AI:[/bold green]")
                console.print(Markdown(result["message"]))

                if result["suggested_commands"]:
                    console.print("\n[bold yellow]Suggested commands:[/bold yellow]")
                    for i, cmd in enumerate(result["suggested_commands"], 1):
                        console.print(f"  {i}. [cyan]{cmd}[/cyan]")

                    # Ask to execute
                    choice = console.input(
                        "\n[dim]Enter number to execute, or press Enter to skip:[/dim] "
                    )
                    if choice.isdigit():
                        idx = int(choice) - 1
                        if 0 <= idx < len(result["suggested_commands"]):
                            cmd = result["suggested_commands"][idx]
                            console.print(f"\n[dim]Executing: {cmd}[/dim]")
                            exec_response = await client.post(
                                f"/workspaces/{workspace_id}/exec",
                                params={"command": cmd},
                            )
                            if exec_response.status_code == 200:
                                exec_result = exec_response.json()
                                console.print(exec_result["output"])

                console.print()

            except KeyboardInterrupt:
                break
            except Exception as e:
                console.print(f"[red]Error: {e}[/red]")

        console.print("[dim]AI session ended[/dim]")


# =============================================================================
# Session Commands
# =============================================================================


@app.command("sessions")
def list_sessions(
    workspace_id: Optional[str] = typer.Option(None, "--workspace", "-w", help="Filter by workspace"),
):
    """List active terminal sessions."""
    with get_client() as client:
        params = {}
        if workspace_id:
            params["workspace_id"] = workspace_id
        response = client.get("/sessions", params=params)
        response.raise_for_status()
        sessions = response.json()

    if not sessions:
        console.print("[dim]No active sessions[/dim]")
        return

    table = Table(title="Terminal Sessions")
    table.add_column("ID", style="dim")
    table.add_column("Workspace")
    table.add_column("Status")
    table.add_column("Size")
    table.add_column("Created")

    status_colors = {
        "connected": "green",
        "connecting": "yellow",
        "disconnected": "red",
        "error": "red",
    }

    for session in sessions:
        status = session["status"]
        color = status_colors.get(status, "white")
        table.add_row(
            session["id"][:8] + "...",
            session["workspace_id"][:8] + "...",
            f"[{color}]{status}[/{color}]",
            f"{session['cols']}x{session['rows']}",
            session["created_at"][:19],
        )

    console.print(table)


@app.command("kill")
def kill_session(session_id: str = typer.Argument(..., help="Session ID to kill")):
    """Kill a terminal session."""
    with get_client() as client:
        response = client.delete(f"/sessions/{session_id}")
        response.raise_for_status()

    console.print(f"[green]✓[/green] Session killed")


# =============================================================================
# Info Commands
# =============================================================================


@app.command("info")
def show_info():
    """Show API and connection info."""
    with get_client() as client:
        try:
            response = client.get("/")
            response.raise_for_status()
            info = response.json()
        except Exception as e:
            console.print(f"[red]Failed to connect to API: {e}[/red]")
            raise typer.Exit(1)

    console.print(
        Panel(
            f"[bold]API URL:[/bold] {API_URL}\n"
            f"[bold]WebSocket URL:[/bold] {WS_URL}\n\n"
            f"[bold]Daytona:[/bold] {'✓' if info['integrations']['daytona'] else '✗'}\n"
            f"[bold]Claude:[/bold] {'✓' if info['integrations']['claude'] else '✗'}\n"
            f"[bold]OpenAI:[/bold] {'✓' if info['integrations']['openai'] else '✗'}",
            title=info["name"],
        )
    )


def main():
    """Main entry point."""
    app()


if __name__ == "__main__":
    main()
