# Daytona Terminal Makefile
# Provides convenient commands for development and deployment

.PHONY: help install dev build test lint clean docker-build docker-up docker-down

# Default target
help:
	@echo "Daytona Terminal - Development Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Development:"
	@echo "  install      Install all dependencies"
	@echo "  dev          Start development servers"
	@echo "  backend      Start backend only"
	@echo "  frontend     Start frontend only"
	@echo ""
	@echo "Testing:"
	@echo "  test         Run all tests"
	@echo "  test-backend Run backend tests"
	@echo "  lint         Run linters"
	@echo ""
	@echo "Docker:"
	@echo "  docker-build Build Docker images"
	@echo "  docker-up    Start with Docker Compose"
	@echo "  docker-down  Stop Docker containers"
	@echo ""
	@echo "Utilities:"
	@echo "  clean        Clean build artifacts"
	@echo "  docs         Generate documentation"

# Install dependencies
install:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installing CLI..."
	cd cli && pip install -e .
	@echo "Done!"

# Development servers
dev:
	@echo "Starting development servers..."
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:3000"
	@make -j2 backend frontend

backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm run dev

# Testing
test: test-backend

test-backend:
	cd backend && pytest -v

lint:
	cd backend && ruff check . && black --check .
	cd frontend && npm run lint

# Docker
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d
	@echo "Services started!"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:8000"

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

# Clean
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "dist" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true

# Documentation
docs:
	@echo "Documentation is in the docs/ directory"
	@echo "Main README: README.md"
