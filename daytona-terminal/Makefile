# Daytona Terminal Makefile
# The best AI terminal ever

.PHONY: help install dev build test lint clean docker-build docker-up docker-down

# Default target
help:
	@echo ""
	@echo "  🚀 Daytona Terminal - The Best AI Terminal"
	@echo ""
	@echo "  Usage: make [target]"
	@echo ""
	@echo "  Development:"
	@echo "    install      Install all dependencies"
	@echo "    dev          Start development servers"
	@echo "    backend      Start backend only"
	@echo "    frontend     Start frontend only"
	@echo ""
	@echo "  Testing & Quality:"
	@echo "    test         Run all tests"
	@echo "    lint         Run linters"
	@echo "    type-check   Run TypeScript type checking"
	@echo ""
	@echo "  Docker:"
	@echo "    docker-build Build Docker images"
	@echo "    docker-up    Start with Docker Compose"
	@echo "    docker-down  Stop Docker containers"
	@echo ""
	@echo "  CLI:"
	@echo "    cli-install  Install CLI globally"
	@echo ""

# Install dependencies
install:
	@echo "📦 Installing backend dependencies..."
	cd backend && npm install
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install
	@echo "📦 Installing CLI dependencies..."
	cd cli && npm install
	@echo "✅ Done!"

# Development servers
dev:
	@echo "🚀 Starting development servers..."
	@echo "   Backend:  http://localhost:8000"
	@echo "   Frontend: http://localhost:3000"
	@make -j2 backend frontend

backend:
	cd backend && npm run dev

frontend:
	cd frontend && npm run dev

# Testing & Quality
test:
	cd backend && npm test

lint:
	cd backend && npm run lint
	cd frontend && npm run lint

type-check:
	cd backend && npm run type-check
	cd frontend && npm run type-check

# Docker
docker-build:
	docker-compose build

docker-up:
	docker-compose up -d
	@echo ""
	@echo "🚀 Daytona Terminal is running!"
	@echo "   Frontend: http://localhost:3000"
	@echo "   Backend:  http://localhost:8000"
	@echo ""

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

# CLI
cli-install:
	cd cli && npm install && npm link
	@echo "✅ CLI installed! Run 'dt --help' to get started."

# Clean
clean:
	rm -rf backend/node_modules backend/dist
	rm -rf frontend/node_modules frontend/dist
	rm -rf cli/node_modules cli/dist
	@echo "✅ Cleaned!"
