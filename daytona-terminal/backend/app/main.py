"""Main FastAPI application for Daytona Terminal."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import ai, sessions, workspaces
from app.api.websocket import router as websocket_router
from app.core.config import settings
from app.core.logging import logger
from app.services.daytona import get_daytona_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    logger.info(f"Starting {settings.app_name}...")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")
    
    # Check Daytona API connection
    if settings.daytona_api_key:
        logger.info(f"Daytona API URL: {settings.daytona_api_url}")
    else:
        logger.warning("Running in local mode (no Daytona API key configured)")
    
    # Check AI integrations
    if settings.anthropic_api_key:
        logger.info("Claude integration: enabled")
    if settings.openai_api_key:
        logger.info("OpenAI integration: enabled")
    
    yield
    
    # Cleanup
    logger.info("Shutting down...")
    daytona = get_daytona_service()
    await daytona.close()


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="""
    Feature-rich terminal on Daytona.io infrastructure with AI coding assistant support.
    
    ## Features
    
    - **Workspace Management**: Create, start, stop, and delete Daytona workspaces
    - **Terminal Sessions**: Real-time terminal access via WebSocket
    - **AI Assistants**: Integrated Claude Code and OpenAI support
    - **Command Execution**: Execute commands in workspaces
    
    ## WebSocket Protocol
    
    Connect to `/ws/terminal/{session_id}` for real-time terminal I/O.
    
    Messages:
    - `{"type": "input", "data": "..."}` - Send terminal input
    - `{"type": "resize", "cols": N, "rows": N}` - Resize terminal
    - `{"type": "ping"}` - Heartbeat
    """,
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Include routers
app.include_router(workspaces.router, prefix="/api/v1")
app.include_router(sessions.router, prefix="/api/v1")
app.include_router(ai.router, prefix="/api/v1")
app.include_router(websocket_router)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": "0.1.0",
        "environment": settings.environment,
    }


# API info endpoint
@app.get("/api/v1")
async def api_info():
    """API information endpoint."""
    return {
        "name": settings.app_name,
        "version": "0.1.0",
        "endpoints": {
            "workspaces": "/api/v1/workspaces",
            "sessions": "/api/v1/sessions",
            "ai": "/api/v1/ai",
            "websocket": "/ws/terminal/{session_id}",
        },
        "integrations": {
            "daytona": bool(settings.daytona_api_key),
            "claude": bool(settings.anthropic_api_key),
            "openai": bool(settings.openai_api_key),
        },
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="debug" if settings.debug else "info",
    )
