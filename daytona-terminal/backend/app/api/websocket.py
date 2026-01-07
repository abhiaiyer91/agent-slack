"""WebSocket handlers for real-time terminal communication."""

import asyncio
import json
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.logging import logger
from app.services.terminal import get_terminal_service

router = APIRouter(tags=["websocket"])


class TerminalWebSocket:
    """
    WebSocket handler for a terminal session.
    
    Protocol:
    - Incoming messages:
        - {"type": "input", "data": "..."} - Terminal input
        - {"type": "resize", "cols": N, "rows": N} - Resize terminal
        - {"type": "ping"} - Heartbeat ping
    
    - Outgoing messages:
        - {"type": "output", "data": "..."} - Terminal output
        - {"type": "error", "message": "..."} - Error message
        - {"type": "pong"} - Heartbeat pong
        - {"type": "connected"} - Connection established
        - {"type": "disconnected"} - Connection closed
    """

    def __init__(self, websocket: WebSocket, session_id: str):
        self.websocket = websocket
        self.session_id = session_id
        self.terminal_service = get_terminal_service()
        self._closed = False
        self._read_task: Optional[asyncio.Task] = None

    async def connect(self):
        """Accept WebSocket connection."""
        await self.websocket.accept()
        logger.info(f"WebSocket connected for session: {self.session_id}")
        
        # Verify session exists
        session = await self.terminal_service.get_session(self.session_id)
        if not session:
            await self.send_error("Session not found")
            await self.websocket.close(code=4004, reason="Session not found")
            return False
        
        await self.send_message({"type": "connected", "session_id": self.session_id})
        return True

    async def send_message(self, message: dict):
        """Send a JSON message."""
        if not self._closed:
            try:
                await self.websocket.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to send message: {e}")

    async def send_output(self, data: bytes):
        """Send terminal output."""
        if data:
            await self.send_message({
                "type": "output",
                "data": data.decode("utf-8", errors="replace"),
            })

    async def send_error(self, message: str):
        """Send an error message."""
        await self.send_message({"type": "error", "message": message})

    async def handle_input(self, data: str):
        """Handle terminal input."""
        try:
            await self.terminal_service.write_to_terminal(
                self.session_id, data.encode("utf-8")
            )
        except Exception as e:
            await self.send_error(f"Input error: {e}")

    async def handle_resize(self, cols: int, rows: int):
        """Handle terminal resize."""
        try:
            await self.terminal_service.resize_terminal(
                self.session_id, cols, rows
            )
        except Exception as e:
            await self.send_error(f"Resize error: {e}")

    async def start_read_loop(self):
        """Start reading from terminal and sending to WebSocket."""
        async def output_callback(data: bytes):
            await self.send_output(data)
        
        self._read_task = await self.terminal_service.start_read_loop(
            self.session_id, output_callback
        )

    async def run(self):
        """Main WebSocket loop."""
        if not await self.connect():
            return
        
        # Start terminal read loop
        await self.start_read_loop()
        
        try:
            while not self._closed:
                try:
                    # Receive message
                    raw_message = await self.websocket.receive()
                    
                    if raw_message["type"] == "websocket.disconnect":
                        break
                    
                    if "text" in raw_message:
                        message = json.loads(raw_message["text"])
                    elif "bytes" in raw_message:
                        # Binary data is treated as raw input
                        await self.handle_input(
                            raw_message["bytes"].decode("utf-8", errors="replace")
                        )
                        continue
                    else:
                        continue
                    
                    msg_type = message.get("type")
                    
                    if msg_type == "input":
                        await self.handle_input(message.get("data", ""))
                    
                    elif msg_type == "resize":
                        cols = message.get("cols", 120)
                        rows = message.get("rows", 40)
                        await self.handle_resize(cols, rows)
                    
                    elif msg_type == "ping":
                        await self.send_message({"type": "pong"})
                    
                    else:
                        logger.warning(f"Unknown message type: {msg_type}")
                
                except WebSocketDisconnect:
                    break
                except json.JSONDecodeError as e:
                    await self.send_error(f"Invalid JSON: {e}")
                except Exception as e:
                    logger.error(f"WebSocket error: {e}")
                    await self.send_error(str(e))
        
        finally:
            await self.close()

    async def close(self):
        """Clean up connection."""
        if self._closed:
            return
        
        self._closed = True
        
        # Cancel read task
        if self._read_task:
            self._read_task.cancel()
            try:
                await self._read_task
            except asyncio.CancelledError:
                pass
        
        logger.info(f"WebSocket disconnected for session: {self.session_id}")
        
        try:
            await self.send_message({"type": "disconnected"})
        except Exception:
            pass


@router.websocket("/ws/terminal/{session_id}")
async def terminal_websocket(websocket: WebSocket, session_id: str):
    """WebSocket endpoint for terminal I/O."""
    handler = TerminalWebSocket(websocket, session_id)
    await handler.run()


@router.websocket("/ws/health")
async def health_websocket(websocket: WebSocket):
    """Health check WebSocket endpoint."""
    await websocket.accept()
    await websocket.send_json({"status": "ok"})
    await websocket.close()
