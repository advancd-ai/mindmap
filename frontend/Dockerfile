# Frontend Dockerfile for Open Mindmap
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund; \
    fi

# Build the application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# VITE_* is not baked in at build time. At container start, docker-entrypoint.sh writes
# /usr/share/nginx/html/runtime-config.js from env (see docs/ENVIRONMENT.md).
RUN npm run build

# Production image - serve with nginx
FROM nginx:alpine AS runner

RUN apk add --no-cache jq

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create non-root user (static files owned by nginx-user; entrypoint runs as root to write runtime-config.js)
RUN addgroup --system --gid 1001 nginx-user && \
    adduser --system --uid 1001 nginx-user && \
    chown -R nginx-user:nginx-user /usr/share/nginx/html

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
