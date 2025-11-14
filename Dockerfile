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

# Build arguments for environment variables (must be before COPY)
ARG EXPO_PUBLIC_PROXY_URL=/api/intra-proxy
ARG BUILD_DATE
ARG GIT_COMMIT

ENV EXPO_PUBLIC_PROXY_URL=${EXPO_PUBLIC_PROXY_URL}

# Verify environment variable is set
RUN echo "Building with EXPO_PUBLIC_PROXY_URL=${EXPO_PUBLIC_PROXY_URL}" && \
    echo "Build date: ${BUILD_DATE}" && \
    echo "Git commit: ${GIT_COMMIT}"

# Copy source code
COPY . .

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
# Force rebuild - Fri Nov 14 14:44:39 CET 2025
