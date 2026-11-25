# Web version

The same Expo app runs in a browser, with one difference: browsers enforce CORS, and the Epitech Intranet sends no CORS headers. The web version therefore calls the Intranet through the **CORS proxy** (`apps/proxy`), which forwards the request with the user's cookie. This guide replaces `WEB_QUICKSTART.md`, `WEB_CORS_LIMITATION.md` and `WEB_TESTING_CHECKLIST.md`.

```
browser ──/api/intra-proxy──> proxy (Express) ──HTTPS + cookie──> intra.epitech.eu
```

## Known limitation

Outside the Epitech network, the Intranet answers requests coming from a server with an **anti-DDoS page**; the proxy then returns `401`. In practice:

| Where the proxy runs                                     | Result                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------- |
| On a computer of the Epitech network (`pnpm proxy`)      | Works                                                         |
| On the VPS (deployed site, https://epicheck.nice-tek.eu) | Refused by the Intranet as long as the VPS address is blocked |

The mobile apps call the Intranet directly and are not affected.

## Run it locally

```bash
pnpm proxy     # terminal 1: http://localhost:3001 (reloads on change)
pnpm web       # terminal 2: http://localhost:8081
```

`apps/mobile` uses `EXPO_PUBLIC_PROXY_URL` (default `http://localhost:3001/api/intra-proxy`); `apps/proxy/.env` must allow the web origin (`ALLOWED_ORIGINS=http://localhost:8081`, see [apps/proxy/README.md](../../apps/proxy/README.md)). With Docker: `docker compose -f docker-compose.dev.yml up`.

## Log in

The web version cannot read the Intranet cookie by itself: follow [auth/INTRANET_COOKIE.md](../auth/INTRANET_COOKIE.md#copy-the-cookie-from-a-browser-web-version-or-fallback) and paste the cookie when asked.

## Check list

1. `curl localhost:3001/health` answers `{"status":"ok",...}`.
2. Log in with a pasted cookie: the activities list appears.
3. Open an activity, scan a QR code with the computer's camera (the browser asks for the camera).
4. Optional: mark a presence on a test activity.

## Troubleshooting

| Symptom                                             | Cause                                                       | Fix                                                                                                |
| --------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Failed to fetch` / `Network request failed`        | Proxy not running                                           | `pnpm proxy`                                                                                       |
| `EADDRINUSE: 3001`                                  | Port taken                                                  | Stop the other process, or set `PORT` in `apps/proxy/.env` and `EXPO_PUBLIC_PROXY_URL` accordingly |
| `CORS header 'Access-Control-Allow-Origin' missing` | Web origin not allowed                                      | Add it to `ALLOWED_ORIGINS` in `apps/proxy/.env`                                                   |
| `401` with an anti-DDoS message                     | Cookie expired, or the Intranet refuses the proxy's address | Paste a fresh cookie; run the proxy from the Epitech network                                       |
| Camera does not start                               | Page not served over HTTPS or `localhost`                   | Use `localhost` or the deployed HTTPS site                                                         |
