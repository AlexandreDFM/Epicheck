/**
 * File Name: simple-proxy.js
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

import cors = require("cors");
const axios = require("axios");
import express = require("express");

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for all origins (adjust in production)
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req: express.Request, res: express.Response) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "EpiCheck CORS Proxy",
    });
});

/**
 * POST /api/intra-proxy
 * Proxy requests to Epitech Intranet API
 *
 * Body:
 *   - endpoint: The API endpoint (e.g., "/user/?format=json")
 *   - cookie: The user's authentication cookie
 *   - method: HTTP method (GET or POST)
 *   - data: Request body (for POST requests)
 */
app.post(
    "/api/intra-proxy",
    async (req: express.Request, res: express.Response) => {
        try {
            const { endpoint, cookie, method = "GET", data } = req.body;

            if (!endpoint) {
                return res.status(400).json({ error: "endpoint is required" });
            }

            if (!cookie) {
                return res.status(400).json({ error: "cookie is required" });
            }

            // Build full URL
            const url = `https://intra.epitech.eu${endpoint}`;

            console.log(`[Proxy] ${method} ${url}`);
            console.log(`[Proxy] Cookie: ${cookie.substring(0, 50)}...`);

            // Make request to Intranet with user's cookie
            const config: any = {
                method: method.toLowerCase(),
                url,
                headers: {
                    // Accept full cookie string (user=xxx; language=fr; antibot=yyy)
                    // If it doesn't contain semicolons, assume it's just the user cookie
                    Cookie: cookie.includes(";") ? cookie : `user=${cookie}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    Accept: "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    Referer: "https://intra.epitech.eu/",
                    Origin: "https://intra.epitech.eu",
                },
            };

            if (method === "POST" && data) {
                config.data = data;
            }

            const response = await axios(config);

            console.log(`[Proxy] ✓ Success: ${response.status}`);

            // Forward the response
            res.status(response.status).json(response.data);
        } catch (error: any) {
            console.error("[Proxy] Error:", error.message);

            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;

                // Check if it's the anti-DDoS page
                if (
                    status === 503 &&
                    typeof data === "string" &&
                    data.includes("Anti-DDoS")
                ) {
                    console.error(
                        "[Proxy] ⚠️ Anti-DDoS page detected - cookie may be invalid or expired",
                    );
                    res.status(401).json({
                        error: "Authentication Required",
                        message:
                            "Your session cookie is invalid or expired. Please log in again.",
                        hint: "Copy a fresh cookie from your browser after logging in to intra.epitech.eu",
                    });
                    return;
                }

                // Forward error response from Intranet
                res.status(error.response.status).json({
                    error: "Intranet API Error",
                    message: error.response.data || error.message,
                    status: error.response.status,
                });
            } else if (error.request) {
                res.status(504).json({
                    error: "Gateway Timeout",
                    message: "No response from Intranet API",
                });
            } else {
                res.status(500).json({
                    error: "Internal Server Error",
                    message: error.message,
                });
            }
        }
    },
);

// 404 handler
app.use((req: express.Request, res: express.Response) => {
    res.status(404).json({
        error: "Not Found",
        message: "The requested endpoint does not exist",
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 EpiCheck CORS Proxy Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(
        `🔗 Proxy endpoint: http://localhost:${PORT}/api/intra-proxy\n`,
    );
});
