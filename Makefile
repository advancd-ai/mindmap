# Open Mindmap - Makefile for easy deployment and development

.PHONY: help dev build up down logs clean deploy-k8s delete-k8s

# Default target
help:
	@echo "🗺️  Open Mindmap - Available Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev              - Start development servers (api + frontend)"
	@echo "  make dev-api          - Start Node.js API development server"
	@echo "  make dev-python-api   - Start Python FastAPI development server"
	@echo "  make dev-frontend     - Start frontend development server"
	@echo ""
	@echo "Docker Compose:"
	@echo "  make build            - Build Docker images"
	@echo "  make up               - Start services with docker-compose"
	@echo "  make down             - Stop services"
	@echo "  make logs             - View logs"
	@echo "  make restart          - Restart services"
	@echo "  make clean            - Remove containers and volumes"
	@echo ""
	@echo "Kubernetes:"
	@echo "  make deploy-k8s       - Deploy to Kubernetes"
	@echo "  make delete-k8s       - Delete from Kubernetes"
	@echo "  make k8s-status       - Check Kubernetes deployment status"
	@echo "  make k8s-logs         - View Kubernetes logs"
	@echo ""
	@echo "Build & Test:"
	@echo "  make install          - Install dependencies"
	@echo "  make test             - Run tests"
	@echo "  make lint             - Run linter"

# Development
dev:
	@echo "🚀 Starting development servers..."
	@echo "Terminal 1: API (port 8787)"
	@echo "Terminal 2: Frontend (port 3000)"
	@echo ""
	@$(MAKE) -j2 dev-api dev-frontend

dev-api:
	cd api && npm install && npm run dev

dev-python-api:
	cd python-api && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python scripts/dev.py

dev-frontend:
	cd frontend && npm install && npm run dev

# Install dependencies
install:
	@echo "📦 Installing dependencies..."
	npm install
	cd api && npm install
	cd frontend && npm install
	cd python-api && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
	@echo "✅ Dependencies installed"

# Linting
lint:
	@echo "🔍 Running linter..."
	npm run lint

# Docker Compose
build:
	@echo "🐳 Building Docker images..."
	cd deployment && ./build.sh

up:
	@echo "🚀 Starting services with Docker Compose..."
	cd deployment/docker && docker-compose up -d
	@echo "✅ Services started"
	@echo ""
	@echo "Access:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  API: http://localhost:8787"

down:
	@echo "🛑 Stopping services..."
	cd deployment/docker && docker-compose down

logs:
	cd deployment/docker && docker-compose logs -f

restart:
	@echo "🔄 Restarting services..."
	cd deployment/docker && docker-compose restart

clean:
	@echo "🧹 Cleaning up Docker resources..."
	cd deployment/docker && docker-compose down -v
	docker system prune -f
	@echo "✅ Cleanup complete"

# Kubernetes
deploy-k8s:
	@echo "☸️  Deploying to Kubernetes..."
	cd deployment && ./deploy-k8s.sh

delete-k8s:
	@echo "🗑️  Deleting from Kubernetes..."
	kubectl delete namespace mindmap

k8s-status:
	@echo "📊 Kubernetes Status:"
	@echo ""
	kubectl get all -n mindmap
	@echo ""
	kubectl get ingress -n mindmap

k8s-logs:
	@echo "📜 Kubernetes Logs:"
	@echo ""
	@echo "Select component:"
	@echo "  1. API"
	@echo "  2. Frontend"
	@echo "  3. Redis"
	@read -p "Enter choice: " choice; \
	case $$choice in \
		1) kubectl logs -f deployment/mindmap-api -n mindmap ;; \
		2) kubectl logs -f deployment/mindmap-frontend -n mindmap ;; \
		3) kubectl logs -f deployment/redis -n mindmap ;; \
		*) echo "Invalid choice" ;; \
	esac




