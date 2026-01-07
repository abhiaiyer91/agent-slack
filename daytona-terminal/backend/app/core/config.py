"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    app_name: str = "Daytona Terminal"
    debug: bool = False
    environment: str = "development"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Daytona Configuration
    daytona_api_url: str = "https://api.daytona.io"
    daytona_api_key: Optional[str] = None
    daytona_default_image: str = "daytonaio/workspace:latest"
    daytona_workspace_timeout: int = 3600  # seconds

    # Database
    database_url: str = "sqlite+aiosqlite:///./daytona_terminal.db"

    # Authentication
    secret_key: str = "change-me-in-production-use-a-secure-random-key"
    access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    algorithm: str = "HS256"

    # AI Integrations
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

    # Terminal Settings
    terminal_default_shell: str = "/bin/bash"
    terminal_default_cols: int = 120
    terminal_default_rows: int = 40
    terminal_scrollback: int = 10000

    # WebSocket
    ws_heartbeat_interval: int = 30
    ws_max_message_size: int = 1024 * 1024  # 1MB


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
