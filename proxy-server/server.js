/**
 * EpiCheck CORS Proxy Server
 *
 * This proxy server forwards requests to the Epitech Intranet API,
 * bypassing CORS restrictions for web browsers.
 *
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Date: November 12, 2025
 */

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// Enable CORS for all origins (or specify your web app domain)
app.use(
    cors({
        origin: process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(",")
            : "*",
        credentials: true,
    }),
);

// Parse JSON bodies
app.use(express.json());

// Rate limiting to prevent abuse
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
});

app.use("/api/", limiter);

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "EpiCheck CORS Proxy",
    });
});

// Main proxy endpoint
app.post("/api/intra-proxy", async (req, res) => {
    try {
        const { endpoint, cookie, method = "GET", data } = req.body;

        // Validate inputs
        if (!endpoint) {
            return res.status(400).json({
                error: "Missing required parameter: endpoint",
            });
        }

        if (!cookie) {
            return res.status(400).json({
                error: "Missing required parameter: cookie",
            });
        }

        // Validate cookie format (basic check)
        if (cookie.length < 50) {
            return res.status(400).json({
                error: "Invalid cookie format",
            });
        }

        // Log request (without exposing full cookie)
        console.log(
            `[${new Date().toISOString()}] ${method} ${endpoint} | Cookie: ${cookie.substring(0, 20)}...`,
        );
        console.log(`[${new Date().toISOString()}] Cookie length: ${cookie.length} | Type: ${cookie.startsWith('eyJ') ? 'JWT' : 'Standard'}`);

        // Build Intranet URL
        const intraUrl = `https://intra.epitech.eu${endpoint}`;

        // Make request to Epitech Intranet
        const config = {
            method: method.toLowerCase(),
            url: intraUrl,
            headers: {
                Cookie: `user=${cookie}`,
                "User-Agent": "EpiCheck-Proxy/1.0",
                Accept: "application/json",
                Referer: "https://intra.epitech.eu/",
            },
            timeout: 30000, // 30 second timeout
        };

        console.log(`[${new Date().toISOString()}] Request headers:`, JSON.stringify(config.headers, null, 2));

        // Add data for POST/PUT requests
        if (data && ["POST", "PUT", "PATCH"].includes(method.toUpperCase())) {
            config.data = data;
            config.headers["Content-Type"] = "application/json";
        }

        const response = await axios(config);

        console.log(`[${new Date().toISOString()}] ✅ Success: ${response.status}`);

        // Forward the response
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error("[Proxy Error]", error.message);
        console.error("[Proxy Error] Status:", error.response?.status);
        console.error("[Proxy Error] Response type:", typeof error.response?.data);
        
        // Log first 200 chars of error response if it's HTML
        if (typeof error.response?.data === 'string' && error.response.data.includes('<!DOCTYPE')) {
            console.error("[Proxy Error] HTML Response (first 200 chars):", error.response.data.substring(0, 200));
        }

        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            res.status(error.response.status).json({
                error: "Intranet API Error",
                message: error.response.data || error.message,
                status: error.response.status,
            });
        } else if (error.request) {
            // The request was made but no response was received
            res.status(504).json({
                error: "Gateway Timeout",
                message: "No response from Intranet API",
            });
        } else {
            // Something happened in setting up the request
            res.status(500).json({
                error: "Internal Server Error",
                message: error.message,
            });
        }
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: "Not Found",
        message: "The requested endpoint does not exist",
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error("[Server Error]", err);
    res.status(500).json({
        error: "Internal Server Error",
        message:
            process.env.NODE_ENV === "production"
                ? "An error occurred"
                : err.message,
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 EpiCheck CORS Proxy Server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Proxy endpoint: http://localhost:${PORT}/api/intra-proxy`);
    console.log(
        `\n⚠️  Make sure to update your React Native app to use this proxy URL for web platform\n`,
    );
});

// Graceful shutdown
process.on("SIGTERM", () => {
    console.log("\n👋 SIGTERM received, shutting down gracefully...");
    process.exit(0);
});

process.on("SIGINT", () => {
    console.log("\n👋 SIGINT received, shutting down gracefully...");
    process.exit(0);
});
