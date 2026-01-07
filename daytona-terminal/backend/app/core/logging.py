"""Logging configuration for the application."""

import logging
import sys
from typing import Optional

from rich.console import Console
from rich.logging import RichHandler

from app.core.config import settings


def setup_logging(level: Optional[str] = None) -> logging.Logger:
    """Configure and return the application logger."""
    log_level = level or ("DEBUG" if settings.debug else "INFO")

    # Configure rich handler for beautiful console output
    console = Console(stderr=True)
    rich_handler = RichHandler(
        console=console,
        show_time=True,
        show_path=settings.debug,
        rich_tracebacks=True,
        tracebacks_show_locals=settings.debug,
    )

    # Configure root logger
    logging.basicConfig(
        level=log_level,
        format="%(message)s",
        datefmt="[%X]",
        handlers=[rich_handler],
    )

    # Get our application logger
    logger = logging.getLogger("daytona_terminal")
    logger.setLevel(log_level)

    return logger


logger = setup_logging()
