#
# File Name: Dockerfile
# Author: Alexandre DE FREITAS MARTINS
# Creation Date: 5/12/2025
# Description: Production Dockerfile for EpiCheck
#              Multi-stage build for optimized production deployment
# Copyright (c) 2025 Epitech
# Version: 1.0.0
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the 'Software'), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.

# One image for EpiCheck web, used by Kubernetes (production, preprod) and
# docker-compose.yml. It holds the Expo web export served by nginx and the
# CORS proxy (Node), run as two containers of the same pod:
#   proxy: node dist/app.js (the default command), port 3001
#   web:   nginx -e stderr -g 'daemon off;', port 8080, /api -> 127.0.0.1:3001
# Both run as the unprivileged "node" user (uid 1000) and write only under
# /tmp, so the root filesystem can be read-only.

# Workspace manifests only, so that the dependency layers are cached until
# a package.json or the lockfile changes

# Stage 1: Expo web export (platform independent: built on the runner's
# architecture even for an arm64 image)
FROM --platform=$BUILDPLATFORM node:22.21-alpine AS web-build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/mobile/package.json apps/mobile/
COPY apps/proxy/package.json apps/proxy/
RUN pnpm install --frozen-lockfile --filter mobile...
COPY apps/mobile apps/mobile
# Same origin as the app: nginx forwards /api/ to the proxy
ARG EXPO_PUBLIC_PROXY_URL=/api/intra-proxy
ENV EXPO_PUBLIC_PROXY_URL=${EXPO_PUBLIC_PROXY_URL}
RUN pnpm --filter mobile exec expo export --platform web --output-dir dist

# Stage 2: compile the proxy, then keep its production dependencies only
FROM node:22.21-alpine AS proxy-build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/mobile/package.json apps/mobile/
COPY apps/proxy/package.json apps/proxy/
RUN pnpm install --frozen-lockfile --filter proxy...
COPY apps/proxy apps/proxy
RUN pnpm --filter proxy run build && \
    pnpm --filter proxy deploy --prod --legacy /proxy

# Stage 3: final image
FROM node:22.21-alpine
RUN apk add --no-cache nginx && \
    rm -f /etc/nginx/http.d/default.conf && \
    mkdir -p /var/log/nginx /var/lib/nginx && \
    chown -R node:node /var/log/nginx /var/lib/nginx
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY docker/nginx/security-headers.inc /etc/nginx/security-headers.inc
COPY --from=web-build /repo/apps/mobile/dist /usr/share/nginx/html
WORKDIR /app
COPY --from=proxy-build /proxy/package.json ./
COPY --from=proxy-build /proxy/node_modules ./node_modules
COPY --from=proxy-build /repo/apps/proxy/dist/app.js ./dist/app.js

ARG APP_VERSION=dev
ARG GIT_COMMIT=unknown
LABEL org.opencontainers.image.title="EpiCheck" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${GIT_COMMIT}"

ENV NODE_ENV=production \
    PORT=3001
USER node
# HTTP only: TLS ends at the Kubernetes ingress (Traefik)
EXPOSE 8080 3001
CMD ["node", "dist/app.js"]
