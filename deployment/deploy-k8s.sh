#!/bin/bash
# Deploy Open Mindmap to Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}☸️  Deploying Open Mindmap to Kubernetes${NC}"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl is not installed${NC}"
    exit 1
fi

# Check if secrets.yaml exists
if [ ! -f kubernetes/secrets.yaml ]; then
    echo -e "${YELLOW}⚠️  secrets.yaml not found${NC}"
    echo "Please create secrets.yaml from secrets.yaml.example"
    echo ""
    echo "  cp kubernetes/secrets.yaml.example kubernetes/secrets.yaml"
    echo "  # Edit kubernetes/secrets.yaml with your credentials"
    echo ""
    exit 1
fi

# Get current context
CONTEXT=$(kubectl config current-context)
echo -e "${YELLOW}📍 Current context: ${CONTEXT}${NC}"
echo ""
read -p "Continue with this context? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Apply manifests
echo -e "${GREEN}📦 Applying Kubernetes manifests...${NC}"
echo ""

kubectl apply -f kubernetes/namespace.yaml
echo -e "${GREEN}✅ Namespace created${NC}"

kubectl apply -f kubernetes/configmap.yaml
echo -e "${GREEN}✅ ConfigMap applied${NC}"

kubectl apply -f kubernetes/secrets.yaml
echo -e "${GREEN}✅ Secrets applied${NC}"

kubectl apply -f kubernetes/redis-deployment.yaml
echo -e "${GREEN}✅ Redis deployed${NC}"

# Wait for Redis to be ready
echo -e "${YELLOW}⏳ Waiting for Redis to be ready...${NC}"
kubectl wait --for=condition=ready pod -l app=redis -n mindmap --timeout=120s

kubectl apply -f kubernetes/api-deployment.yaml
echo -e "${GREEN}✅ API deployed${NC}"

kubectl apply -f kubernetes/frontend-deployment.yaml
echo -e "${GREEN}✅ Frontend deployed${NC}"

kubectl apply -f kubernetes/ingress.yaml
echo -e "${GREEN}✅ Ingress configured${NC}"

kubectl apply -f kubernetes/hpa.yaml
echo -e "${GREEN}✅ HPA configured${NC}"

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""

# Show status
echo -e "${YELLOW}📊 Status:${NC}"
kubectl get all -n mindmap

echo ""
echo -e "${YELLOW}🔗 Services:${NC}"
kubectl get svc -n mindmap

echo ""
echo -e "${YELLOW}🌐 Ingress:${NC}"
kubectl get ingress -n mindmap

echo ""
echo -e "${GREEN}💡 Next steps:${NC}"
echo "  - Check pod status: kubectl get pods -n mindmap"
echo "  - View logs: kubectl logs -f deployment/mindmap-api -n mindmap"
echo "  - Port forward (testing): kubectl port-forward svc/mindmap-frontend-service 3000:80 -n mindmap"







