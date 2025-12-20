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

# Build arguments for environment variables
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

ARG VITE_ADSENSE_ENABLED
ENV VITE_ADSENSE_ENABLED=${VITE_ADSENSE_ENABLED}

RUN npm run build

# Production image - serve with nginx
FROM nginx:alpine AS runner

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user
RUN addgroup --system --gid 1001 nginx-user && \
    adduser --system --uid 1001 nginx-user && \
    chown -R nginx-user:nginx-user /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]







