# Docker

One image, built by the root `Dockerfile`, is used everywhere: Kubernetes (production and preprod) and the local production-like stack (`docker-compose.yml`).

The image holds the Expo web export, nginx and the CORS proxy, and runs as two processes:

| Container (Kubernetes) / service (Compose) | Command                                                                                       | Port |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- | ---- |
| `web`                                      | `nginx -e stderr -g 'daemon off;'`: web export, `/api` proxied to `127.0.0.1:3001`, `/health` | 8080 |
| `proxy`                                    | `node dist/app.js` (default command): CORS proxy to the Intranet, `/health` and `/api/health` | 3001 |

Both run as the unprivileged `node` user (uid 1000) and write only under `/tmp`, so the root filesystem can be read-only. In Kubernetes they are two containers of the same pod; in Compose, `web` shares the network namespace of `proxy`. The proxy is therefore only reachable through nginx.

## Files

| Path                                | Content                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `docker/nginx/nginx.conf`           | nginx main config (pid and temp files under `/tmp`, logs to the container output)                             |
| `docker/nginx/default.conf`         | Site: SPA fallback, cache rules (hashed bundles cached one year, `index.html` never), `/api` proxy, `/health` |
| `docker/nginx/security-headers.inc` | CSP and security headers of the app (HSTS is set by the ingress)                                              |

The CSP allows one external file: `jsQR` from jsDelivr, which `expo-camera` loads to scan QR codes in the browser. Check it after an Expo upgrade (the version is pinned in the URL).

## Build arguments

| Argument                    | Default            | Use                                    |
| --------------------------- | ------------------ | -------------------------------------- |
| `EXPO_PUBLIC_PROXY_URL`     | `/api/intra-proxy` | Proxy URL compiled into the web export |
| `APP_VERSION`, `GIT_COMMIT` | `dev`, `unknown`   | OCI labels, set by the build workflow  |

## Local stacks

```bash
docker compose up --build                      # docker-compose.yml: same image as production, http://localhost:8080
docker compose -f docker-compose.dev.yml up    # Expo web dev server + proxy with reload, http://localhost:8081
```
