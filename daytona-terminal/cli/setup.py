"""Setup script for Daytona Terminal CLI."""

from setuptools import setup, find_packages

setup(
    name="daytona-terminal-cli",
    version="0.1.0",
    description="CLI for Daytona Terminal",
    author="Daytona Terminal Team",
    py_modules=["daytona_terminal_cli"],
    install_requires=[
        "typer[all]>=0.9.0",
        "rich>=13.7.0",
        "httpx>=0.26.0",
        "websockets>=12.0",
    ],
    entry_points={
        "console_scripts": [
            "daytona-terminal=daytona_terminal_cli:main",
            "dt=daytona_terminal_cli:main",
        ],
    },
    python_requires=">=3.10",
)
