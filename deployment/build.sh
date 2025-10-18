#!/bin/bash
# Build Docker images for Open Mindmap

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐳 Building Open Mindmap Docker Images${NC}"
echo ""

# Get registry from argument or use default
REGISTRY=${1:-""}
VERSION=${2:-"latest"}

if [ -n "$REGISTRY" ]; then
  echo -e "${YELLOW}📦 Using registry: ${REGISTRY}${NC}"
  API_IMAGE="${REGISTRY}/mindmap-api:${VERSION}"
  FRONTEND_IMAGE="${REGISTRY}/mindmap-frontend:${VERSION}"
else
  echo -e "${YELLOW}📦 Using local images${NC}"
  API_IMAGE="mindmap-api:${VERSION}"
  FRONTEND_IMAGE="mindmap-frontend:${VERSION}"
fi

echo ""

# Build backend
echo -e "${GREEN}🔨 Building backend image...${NC}"
docker build -t "${API_IMAGE}" -f ../api/Dockerfile ../api
echo -e "${GREEN}✅ Backend image built: ${API_IMAGE}${NC}"
echo ""

# Build frontend
echo -e "${GREEN}🔨 Building frontend image...${NC}"
VITE_API_URL=${VITE_API_URL:-"http://localhost:8787"}
docker build -t "${FRONTEND_IMAGE}" \
  --build-arg VITE_API_URL="${VITE_API_URL}" \
  -f ../frontend/Dockerfile ../frontend
echo -e "${GREEN}✅ Frontend image built: ${FRONTEND_IMAGE}${NC}"
echo ""

# Push to registry if specified
if [ -n "$REGISTRY" ]; then
  echo -e "${GREEN}📤 Pushing images to registry...${NC}"
  docker push "${API_IMAGE}"
  docker push "${FRONTEND_IMAGE}"
  echo -e "${GREEN}✅ Images pushed to registry${NC}"
  echo ""
fi

echo -e "${GREEN}🎉 Build complete!${NC}"
echo ""
echo "Images:"
echo "  - ${API_IMAGE}"
echo "  - ${FRONTEND_IMAGE}"
echo ""

if [ -z "$REGISTRY" ]; then
  echo -e "${YELLOW}💡 Tip: To push to a registry, run:${NC}"
  echo "  ./build.sh your-registry.com/your-username"
fi




