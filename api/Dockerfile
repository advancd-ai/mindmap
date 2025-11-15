# Backend API Dockerfile
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund; \
    fi

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV LOCAL_GIT_ROOT=/data/repos

# Install git for LocalGitProvider operations
RUN apk add --no-cache git

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create non-root user and ensure mount path writable
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs && \
    mkdir -p "$LOCAL_GIT_ROOT" && \
    chown -R nodejs:nodejs /app "$LOCAL_GIT_ROOT"

VOLUME ["$LOCAL_GIT_ROOT"]

USER nodejs

EXPOSE 8787

CMD ["node", "dist/index.js"]
