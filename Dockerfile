# Production Dockerfile for EpiCheck
# Multi-stage build for optimized production deployment

# Stage 1: Build
FROM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build arguments for environment variables
ARG EXPO_PUBLIC_PROXY_URL=http://localhost:3001/api/intra-proxy
ENV EXPO_PUBLIC_PROXY_URL=${EXPO_PUBLIC_PROXY_URL}

# Build the web version of the app for production using Metro
RUN npx expo export --platform web

# Stage 2: Production
FROM nginx:alpine

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration if needed
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
