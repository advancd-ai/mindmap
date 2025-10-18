# Deployment Guide

This directory contains deployment configurations for Open Mindmap.

## 📁 Directory Structure

```
deployment/
├── docker/
│   ├── docker-compose.yml       # Docker Compose configuration
│   └── .env.example            # Environment variables template
├── kubernetes/
│   ├── namespace.yaml          # Kubernetes namespace
│   ├── configmap.yaml          # Configuration
│   ├── secrets.yaml.example    # Secrets template
│   ├── redis-deployment.yaml   # Redis cache
│   ├── api-deployment.yaml     # Backend API
│   ├── frontend-deployment.yaml # Frontend
│   ├── ingress.yaml            # Ingress controller
│   └── hpa.yaml               # Horizontal Pod Autoscaler
├── build.sh                    # Build Docker images script
├── deploy-k8s.sh              # Deploy to Kubernetes script
├── nginx.conf                  # Nginx configuration for frontend
├── .gitignore                 # Ignore secrets and env files
└── README.md                   # This file
```

## 🐳 Docker Compose Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

### Option 1: Using docker-compose command

1. **Copy environment file:**
```bash
cd deployment/docker
cp .env.example .env
```

2. **Edit `.env` with your credentials:**
```bash
# Required
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_TOKEN=ghp_your_token
GITHUB_OWNER=your-username

# Optional
FRONTEND_URL=http://localhost:3000
GOOGLE_REDIRECT_URI=http://localhost:8787/auth/google/callback
```

3. **Build and start services:**
```bash
docker-compose up -d
```

4. **Check status:**
```bash
docker-compose ps
docker-compose logs -f
```

5. **Access the application:**
- Frontend: http://localhost:3000
- API: http://localhost:8787
- Health check: http://localhost:8787/health

### Services

| Service | Port | Description |
|---------|------|-------------|
| `frontend` | 3000 | React frontend (nginx) |
| `api` | 8787 | Node.js backend (Hono) |
| `redis` | 6379 | Redis cache & sessions |

### Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Rebuild after code changes
docker-compose up -d --build

# Restart a service
docker-compose restart [service-name]

# Remove everything including volumes
docker-compose down -v
```

### Environment Variables

See `deployment/docker/.env.example` for all available options.

### Option 2: Using Build Script

The `build.sh` script automates building and optionally pushing images:

```bash
# Build locally
./build.sh

# Build and push to registry
./build.sh your-registry.com/your-username v1.0.0

# With custom API URL
VITE_API_URL=https://api.yourdomain.com ./build.sh your-registry v1.0.0
```

## ☸️ Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (1.19+)
- kubectl configured
- Container registry (Docker Hub, GCR, ECR, etc.)

### Setup

#### 1. Build and Push Images

```bash
# Build images
cd /path/to/mindmap

# Backend
docker build -t your-registry/mindmap-api:latest -f api/Dockerfile ./api
docker push your-registry/mindmap-api:latest

# Frontend
docker build -t your-registry/mindmap-frontend:latest \
  --build-arg VITE_API_URL=https://api.yourdomain.com \
  -f frontend/Dockerfile ./frontend
docker push your-registry/mindmap-frontend:latest
```

#### 2. Update Image References

Edit `deployment/kubernetes/*.yaml` files and replace `mindmap-api:latest` and `mindmap-frontend:latest` with your registry URLs:

```yaml
image: your-registry/mindmap-api:latest
image: your-registry/mindmap-frontend:latest
```

#### 3. Create Secrets

```bash
# Copy and edit secrets file
cd deployment/kubernetes
cp secrets.yaml.example secrets.yaml
# Edit secrets.yaml with your credentials

# Apply secrets
kubectl apply -f secrets.yaml

# Or create from command line:
kubectl create secret generic mindmap-secrets \
  --from-literal=GOOGLE_CLIENT_ID=your-id \
  --from-literal=GOOGLE_CLIENT_SECRET=your-secret \
  --from-literal=GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback \
  --from-literal=GITHUB_TOKEN=ghp_xxx \
  --from-literal=GITHUB_OWNER=your-username \
  --from-literal=REDIS_PASSWORD= \
  -n mindmap
```

#### 4. Update ConfigMap

Edit `configmap.yaml` with your domain:

```yaml
FRONTEND_URL: "https://yourdomain.com"
CORS_ORIGIN: "https://yourdomain.com"
```

#### 5. Deploy to Kubernetes

**Option A: Using deploy script (Recommended)**

```bash
cd deployment
./deploy-k8s.sh
```

The script will:
- Check prerequisites
- Confirm current kubectl context
- Apply all manifests in correct order
- Wait for services to be ready
- Show status and next steps

**Option B: Manual deployment**

```bash
cd deployment/kubernetes

# Apply in order
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f api-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml
```

#### 6. Verify Deployment

```bash
# Check all resources
kubectl get all -n mindmap

# Check pods
kubectl get pods -n mindmap

# Check services
kubectl get svc -n mindmap

# Check ingress
kubectl get ingress -n mindmap

# View logs
kubectl logs -f deployment/mindmap-api -n mindmap
kubectl logs -f deployment/mindmap-frontend -n mindmap
```

### Ingress Configuration

The `ingress.yaml` supports two routing modes:

#### Option 1: Separate Subdomains
- Frontend: `https://yourdomain.com`
- API: `https://api.yourdomain.com`

Update `GOOGLE_REDIRECT_URI` and `VITE_API_URL` accordingly.

#### Option 2: Path-based Routing
- Frontend: `https://yourdomain.com/`
- API: `https://yourdomain.com/api/`

Requires path rewriting in ingress annotations.

### Scaling

#### Manual Scaling

```bash
# Scale API
kubectl scale deployment mindmap-api --replicas=5 -n mindmap

# Scale Frontend
kubectl scale deployment mindmap-frontend --replicas=3 -n mindmap
```

#### Auto-scaling (HPA)

HPA is configured in `hpa.yaml`:
- **API**: 2-10 replicas based on CPU/Memory
- **Frontend**: 2-5 replicas based on CPU/Memory

Metrics:
- CPU threshold: 70%
- Memory threshold: 80%

### Monitoring

```bash
# Watch pods
kubectl get pods -n mindmap -w

# Describe pod
kubectl describe pod <pod-name> -n mindmap

# View events
kubectl get events -n mindmap --sort-by='.lastTimestamp'

# Check HPA status
kubectl get hpa -n mindmap
```

### Updates & Rollbacks

```bash
# Update image
kubectl set image deployment/mindmap-api api=your-registry/mindmap-api:v2 -n mindmap

# Check rollout status
kubectl rollout status deployment/mindmap-api -n mindmap

# Rollback
kubectl rollout undo deployment/mindmap-api -n mindmap

# View rollout history
kubectl rollout history deployment/mindmap-api -n mindmap
```

## 🔒 Security Best Practices

### Secrets Management

1. **Never commit secrets to git**
   - Add `secrets.yaml` to `.gitignore`
   - Use `secrets.yaml.example` as template

2. **Use external secret managers:**
   - AWS Secrets Manager
   - HashiCorp Vault
   - Google Secret Manager
   - Azure Key Vault

3. **Rotate credentials regularly:**
   - GitHub tokens
   - Google OAuth secrets
   - Redis passwords

### Network Security

1. **Use HTTPS only in production**
2. **Configure CORS properly**
3. **Enable rate limiting**
4. **Use Network Policies** (Kubernetes)

### Image Security

1. **Scan images for vulnerabilities:**
```bash
docker scan mindmap-api:latest
docker scan mindmap-frontend:latest
```

2. **Use non-root users** (already configured in Dockerfiles)
3. **Keep base images updated**

## 📊 Resource Requirements

### Minimum (Development/Small Team)

| Component | CPU | Memory | Storage |
|-----------|-----|--------|---------|
| API | 200m | 256Mi | - |
| Frontend | 100m | 128Mi | - |
| Redis | 100m | 128Mi | 1Gi |

### Recommended (Production)

| Component | CPU | Memory | Storage |
|-----------|-----|--------|---------|
| API | 500m | 512Mi | - |
| Frontend | 200m | 256Mi | - |
| Redis | 200m | 256Mi | 5Gi |

### Scaling Guidelines

- **API**: 1 pod per 100 concurrent users
- **Frontend**: Static content, can handle 1000+ users per pod
- **Redis**: Single instance sufficient for < 10K sessions

## 🔧 Troubleshooting

### Docker Compose

**Services won't start:**
```bash
# Check logs
docker-compose logs api
docker-compose logs frontend
docker-compose logs redis

# Rebuild
docker-compose build --no-cache
docker-compose up -d
```

**Port conflicts:**
```bash
# Change ports in docker-compose.yml
ports:
  - "8080:80"      # Frontend: 8080 instead of 3000
  - "8788:8787"    # API: 8788 instead of 8787
```

**Redis connection issues:**
```bash
# Check Redis is running
docker-compose exec redis redis-cli ping
# Should return: PONG

# Check Redis logs
docker-compose logs redis
```

### Kubernetes

**Pods not starting:**
```bash
# Describe pod
kubectl describe pod <pod-name> -n mindmap

# Check events
kubectl get events -n mindmap

# Check logs
kubectl logs <pod-name> -n mindmap
```

**Image pull errors:**
```bash
# Check image exists
docker pull your-registry/mindmap-api:latest

# Create image pull secret
kubectl create secret docker-registry regcred \
  --docker-server=your-registry \
  --docker-username=your-username \
  --docker-password=your-password \
  -n mindmap

# Add to deployment:
spec:
  imagePullSecrets:
  - name: regcred
```

**Service not accessible:**
```bash
# Check service
kubectl get svc -n mindmap

# Port forward for testing
kubectl port-forward svc/mindmap-api-service 8787:8787 -n mindmap

# Check ingress
kubectl describe ingress mindmap-ingress -n mindmap
```

## 🌐 Production Considerations

### Domain Setup

1. **DNS Configuration:**
   - Point `yourdomain.com` to LoadBalancer IP
   - Point `api.yourdomain.com` to LoadBalancer IP

2. **SSL/TLS:**
   - Install cert-manager in cluster
   - Configure Let's Encrypt issuer
   - Update `ingress.yaml` with your domain

3. **Google OAuth Redirect URI:**
   - Update in Google Cloud Console
   - Add production URL: `https://yourdomain.com/auth/google/callback`

### Environment Variables

Update for production:

**Backend:**
```yaml
GOOGLE_REDIRECT_URI: "https://api.yourdomain.com/auth/google/callback"
FRONTEND_URL: "https://yourdomain.com"
CORS_ORIGIN: "https://yourdomain.com"
```

**Frontend:**
```bash
VITE_API_URL=https://api.yourdomain.com
```

### Monitoring

Recommended tools:
- **Logs**: ELK Stack, Loki, CloudWatch
- **Metrics**: Prometheus + Grafana
- **Tracing**: Jaeger, Zipkin
- **Uptime**: UptimeRobot, Pingdom

### Backup

**Redis data:**
```bash
# Docker Compose
docker-compose exec redis redis-cli BGSAVE
docker cp mindmap-redis:/data/dump.rdb ./backup/

# Kubernetes
kubectl exec -it redis-0 -n mindmap -- redis-cli BGSAVE
```

**GitHub data:**
- Already backed up in GitHub repositories
- Each user's data is version controlled
- No additional backup needed

## 📚 Related Documentation

- **[../docs/DEPLOY.md](../docs/DEPLOY.md)** - General deployment guide
- **[../docs/GOOGLE_OAUTH_SETUP.md](../docs/GOOGLE_OAUTH_SETUP.md)** - OAuth setup
- **[../docs/GITHUB_SETUP.md](../docs/GITHUB_SETUP.md)** - GitHub setup
- **[../README.md](../README.md)** - Main documentation

## 🚀 Quick Deploy Commands

### Docker Compose
```bash
cd deployment/docker
cp .env.example .env
# Edit .env
docker-compose up -d
```

### Kubernetes
```bash
cd deployment/kubernetes
# Edit secrets.yaml and configmap.yaml
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f api-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml
```

### Verification
```bash
# Docker Compose
curl http://localhost:8787/health
curl http://localhost:3000

# Kubernetes
kubectl get pods -n mindmap
kubectl get svc -n mindmap
kubectl get ingress -n mindmap
```

---

**Open Mindmap Deployment** - Production-ready configurations for Docker and Kubernetes 🚀

