# EpiCheck CORS Proxy Server

The Epitech Intranet sends no CORS headers, so the **web** version of EpiCheck cannot call it from a browser. This proxy receives the request from the web app and forwards it to `https://intra.epitech.eu` with the user's cookie. The mobile apps call the Intranet directly and do not use it.

> **Known limitation:** outside the Epitech network, the Intranet answers requests coming from a server with an anti-DDoS page. The proxy then answers `401`. The web version is therefore only reliable when the proxy runs from the school network; the mobile app works everywhere.

## Quick start

Requires Node 22 and pnpm (`corepack enable` picks the version from `package.json`).

```bash
cd proxy-server
pnpm install
cp .env.example .env
pnpm dev          # restarts when app.ts changes
```

From the repository root, `pnpm proxy` does the same. The server listens on `http://localhost:3001`.

| Script           | Purpose                                                         |
| ---------------- | --------------------------------------------------------------- |
| `pnpm dev`       | Run `app.ts` with ts-node, reload on change                     |
| `pnpm build`     | Compile to `dist/`                                              |
| `pnpm start`     | Run the compiled `dist/app.js`                                  |
| `pnpm typecheck` | Type check only                                                 |
| `pnpm test`      | Compile and run `app.test.ts` (no request reaches the Intranet) |

## API

### `GET /health` and `GET /api/health`

```json
{
    "status": "ok",
    "timestamp": "2026-11-25T12:00:00.000Z",
    "service": "EpiCheck CORS Proxy"
}
```

### `POST /api/intra-proxy`

```json
{
    "endpoint": "/user/?format=json",
    "cookie": "<value of the Intranet 'user' cookie, or a full cookie string>",
    "method": "GET",
    "data": {}
}
```

| Rule                                                                          | Answer when broken                                                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `endpoint` is a path that stays on `https://intra.epitech.eu`                 | `400`                                                                          |
| `method` is `GET` or `POST`                                                   | `400`                                                                          |
| `cookie` is a non-empty string (max 4 KB, single line)                        | `400`                                                                          |
| At most `RATE_LIMIT_PER_MINUTE` requests per minute and per client on `/api/` | `429`                                                                          |
| The Intranet answers                                                          | Its status and JSON body; `504` on timeout (15 s); `401` on the anti-DDoS page |

Redirects are not followed, and the cookie is never logged: only the method, path and status.

## Configuration

| Variable                | Default   | Description                                                                                                                                                                 |
| ----------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                  | `3001`    | Listening port                                                                                                                                                              |
| `ALLOWED_ORIGINS`       | _(empty)_ | Comma-separated browser origins allowed to call the proxy directly (Expo dev server). Leave empty when nginx serves the app and `/api` on the same origin, as in production |
| `TRUST_PROXY`           | `1`       | Number of reverse proxies in front (nginx, ingress), so that the rate limit sees the client address                                                                         |
| `RATE_LIMIT_PER_MINUTE` | `120`     | Requests per minute and per client on `/api/`                                                                                                                               |

## Docker

The proxy has no image of its own: the root `Dockerfile` builds one image with the web export, nginx and the proxy, run as two containers ([docker/README.md](../docker/README.md)).

```bash
docker compose -f ../docker-compose.dev.yml up proxy   # development, reloads app.ts
```

In production the proxy runs in Kubernetes next to nginx, in the same pod (`location /api/` → `127.0.0.1:3001`); see [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).
