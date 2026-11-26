/**
 * File Name: app.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 5/12/2025
 * Description: CORS Proxy for Epitech Intranet
 *              This proxy forwards requests to intra.epitech.eu with the user's cookie
 *              to bypass browser CORS restrictions on the web platform
 * Copyright (c) 2025 Epitech
 * Version: 1.0.0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the 'Software'), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import "dotenv/config";
import axios, { AxiosRequestConfig } from "axios";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";

const INTRA_ORIGIN = "https://intra.epitech.eu";
const ALLOWED_METHODS = new Set(["GET", "POST"]);
const MAX_COOKIE_LENGTH = 4096;

const PORT = Number(process.env.PORT) || 3001;
// Browser origins allowed to call the proxy directly (local development).
// In production the web app and /api share one origin through nginx, so
// this stays empty and no CORS header is sent.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
// Number of reverse proxies in front of this server (nginx, ingress), so
// that the rate limit sees the client address
const TRUST_PROXY = Number(process.env.TRUST_PROXY ?? 1);
const RATE_LIMIT_PER_MINUTE = Number(process.env.RATE_LIMIT_PER_MINUTE) || 120;

/**
 * Resolve an Intranet path ("/user/?format=json") against the Intranet
 * origin. Anything that would leave that origin ("@host", ".host", "//host",
 * absolute URLs) is refused, so the user's cookie is only ever sent to the
 * Intranet.
 */
export function buildIntraUrl(endpoint: unknown): string | null {
    if (
        typeof endpoint !== "string" ||
        !endpoint.startsWith("/") ||
        endpoint.length > 2048
    ) {
        return null;
    }
    try {
        const url = new URL(endpoint, INTRA_ORIGIN);
        return url.origin === INTRA_ORIGIN ? url.href : null;
    } catch {
        return null;
    }
}

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", TRUST_PROXY);
app.use(helmet());
app.use(cors({ origin: ALLOWED_ORIGINS, methods: ["GET", "POST"] }));
app.use(express.json({ limit: "100kb" }));

const health = (_req: Request, res: Response) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "EpiCheck CORS Proxy",
    });
};
app.get("/health", health);
app.get("/api/health", health);

app.use(
    "/api/",
    rateLimit({
        windowMs: 60_000,
        limit: RATE_LIMIT_PER_MINUTE,
        standardHeaders: "draft-7",
        legacyHeaders: false,
    }),
);

/**
 * POST /api/intra-proxy
 * Proxy requests to Epitech Intranet API
 *
 * Body:
 *   - endpoint: The Intranet path (e.g., "/user/?format=json")
 *   - cookie: The user's authentication cookie
 *   - method: HTTP method (GET or POST)
 *   - data: Request body (for POST requests)
 */
app.post("/api/intra-proxy", async (req: Request, res: Response) => {
    const { endpoint, cookie, data } = req.body ?? {};
    const method = String(req.body?.method ?? "GET").toUpperCase();

    const url = buildIntraUrl(endpoint);
    if (!url) {
        return res
            .status(400)
            .json({ error: "endpoint must be an Intranet path" });
    }
    if (!ALLOWED_METHODS.has(method)) {
        return res.status(400).json({ error: "method must be GET or POST" });
    }
    if (
        typeof cookie !== "string" ||
        !cookie ||
        cookie.length > MAX_COOKIE_LENGTH ||
        /[\r\n]/.test(cookie)
    ) {
        return res.status(400).json({ error: "cookie is required" });
    }

    // Log the path only: no query string, never the cookie
    const path = new URL(url).pathname;

    const config: AxiosRequestConfig = {
        method,
        url,
        timeout: 15_000,
        // A redirect could take the cookie to another host
        maxRedirects: 0,
        headers: {
            // Accept full cookie string (user=xxx; language=fr; antibot=yyy)
            // If it doesn't contain semicolons, assume it's just the user cookie
            Cookie: cookie.includes(";") ? cookie : `user=${cookie}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: `${INTRA_ORIGIN}/`,
            Origin: INTRA_ORIGIN,
        },
    };
    if (method === "POST" && data !== undefined) {
        config.data = data;
    }

    try {
        const response = await axios(config);
        console.log(`[Proxy] ${method} ${path} -> ${response.status}`);
        return res.status(response.status).json(response.data);
    } catch (error: any) {
        const status: number | undefined = error.response?.status;
        const body = error.response?.data;
        console.error(
            `[Proxy] ${method} ${path} -> ${status ?? error.code ?? "error"}`,
        );

        if (status === undefined) {
            return res.status(504).json({
                error: "Gateway Timeout",
                message: "No response from Intranet API",
            });
        }

        // Anti-DDoS page: the Intranet refuses this server's address or the
        // cookie (seen outside the Epitech network)
        if (
            status === 503 &&
            typeof body === "string" &&
            body.includes("Anti-DDoS")
        ) {
            return res.status(401).json({
                error: "Authentication Required",
                message:
                    "The Intranet refused the request (anti-DDoS page). Log in again, or use the mobile app.",
            });
        }

        // Forward the Intranet's own message only, never internal details
        return res.status(status).json({
            error: "Intranet API Error",
            message:
                typeof body?.message === "string"
                    ? body.message
                    : `Intranet answered ${status}`,
            status,
        });
    }
});

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        error: "Not Found",
        message: "The requested endpoint does not exist",
    });
});

// Malformed JSON and other errors: no stack trace in the response
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = Number(err?.status) || 500;
    res.status(status).json({
        error: status === 500 ? "Internal Server Error" : "Bad Request",
    });
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`EpiCheck CORS Proxy listening on port ${PORT}`);
    });
}

export default app;
