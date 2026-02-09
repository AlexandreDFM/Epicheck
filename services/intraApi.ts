/**
 * File Name: intraApi.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 29/10/2025
 * Description: This is the intraApi.ts
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

import intraAuth from "./intraAuth";
import { Platform } from "react-native";
import axios, { AxiosInstance } from "axios";
import type { IIntraUser } from "../types/IIntraUser";
import type { IIntraEvent } from "../types/IIntraEvent";
import type { IIntraStudent } from "../types/IIntraStudent";
import type { IPresenceUpdate } from "../types/IPresenceUpdate";
import type { IIntraModuleInfo } from "../types/IIntraModuleInfo";

const INTRA_BASE_URL = "https://intra.epitech.eu";
const PROXY_BASE_URL =
    process.env.EXPO_PUBLIC_PROXY_URL ||
    "http://localhost:3001/api/intra-proxy"; // For web platform
const BACKEND_BASE_URL =
    process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3001";

class IntraApiService {
    private api: AxiosInstance;
    private isWeb: boolean;

    constructor() {
        this.isWeb = Platform.OS === "web";

        this.api = axios.create({
            baseURL: INTRA_BASE_URL,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            withCredentials: true,
        });

        // Add request interceptor to include auth cookie
        this.api.interceptors.request.use(
            async (config) => {
                // Get Intranet cookie and use it as Bearer token
                const cookie = await intraAuth.getIntraCookie();

                if (!cookie) {
                    console.warn(
                        "⚠️ No Intranet cookie found. User may need to authenticate.",
                    );
                } else {
                    console.log(
                        "✓ Using Intranet cookie for request:",
                        config.url,
                        "| Cookie length:",
                        cookie.length,
                    );
                }

                if (cookie) {
                    if (!config.headers) {
                        config.headers = {} as any;
                    }
                    config.headers.Authorization = `Bearer ${cookie}`;
                }

                // Add format=json to all requests
                if (!config.params) {
                    config.params = {};
                }
                if (!config.params.format) {
                    config.params.format = "json";
                }

                return config;
            },
            (error) => Promise.reject(error),
        );

        // Add response interceptor to log errors
        this.api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response.status === 403) {
                    const message = "\tStatus:\t" + (error.response.status) + "\n\tURL:\t" + error.config?.url + (error.response.data.message ? "\n\tLog: " : "\n\tData:\t") + (error.response.data.message || error.response.data);
                    console.warn("[IntraAPI] Access Forbidden. User may not have rights to access this resource:\n", message);
                } else if (error.response) {
                    console.error("Intranet API Error:");
                    console.error("  Status:", error.response.status);
                    console.error("  URL:", error.config?.url);
                    console.error("  Data:", error.response.data);
                }
                return Promise.reject(error);
            },
        );
    }

    /**
     * Universal request method - uses proxy on web, direct API on mobile
     */
    private async makeRequest(
        endpoint: string,
        method: "GET" | "POST" = "GET",
        data?: any,
        params?: any,
    ): Promise<any> {
        if (this.isWeb) {
            // Web: Use proxy server to bypass CORS
            return this.makeProxyRequest(endpoint, method, data, params);
        } else {
            // Mobile: Direct API calls (no CORS restrictions)
            const config: any = { params };

            if (method === "POST") {
                return (await this.api.post(endpoint, data, config)).data;
            } else {
                return (await this.api.get(endpoint, config)).data;
            }
        }
    }

    /**
     * Make request through proxy server (web only)
     */
    private async makeProxyRequest(
        endpoint: string,
        method: "GET" | "POST" = "GET",
        data?: any,
        params?: any,
    ): Promise<any> {
        const cookie = await intraAuth.getIntraCookie();

        if (!cookie) {
            throw new Error("No authentication found. Please log in first.");
        }

        // Build full endpoint with query params
        let fullEndpoint = endpoint;
        if (params) {
            const queryString = new URLSearchParams(params).toString();
            fullEndpoint += (endpoint.includes("?") ? "&" : "?") + queryString;
        }

        // Always add format=json
        fullEndpoint +=
            (fullEndpoint.includes("?") ? "&" : "?") + "format=json";

        console.log("🌐 Making proxy request:", method, fullEndpoint);

        try {
            const response = await axios.post(PROXY_BASE_URL, {
                endpoint: fullEndpoint,
                cookie,
                method,
                data,
            });

            return response.data;
        } catch (error: any) {
            console.error(
                "Proxy request error:",
                error.response?.data || error.message,
            );

            // Check for authentication errors
            if (error.response?.status === 401) {
                throw new Error(
                    error.response.data?.message ||
                        "Cookie expired. Please log in again with a fresh cookie.",
                );
            }

            // Check if it's a proxied error from Intranet API
            if (error.response?.data?.error) {
                throw new Error(
                    error.response.data.message || error.response.data.error,
                );
            }

            throw error;
        }
    }

    /**
     * Authenticate with Intranet using Office365 OAuth
     * This opens a WebView for authentication and extracts the session cookie
     */
    async authenticate(): Promise<void> {
        await intraAuth.authenticateWithIntranet();
    }

    /**
     * Check if user has valid Intranet session
     */
    async checkSession(): Promise<boolean> {
        return await intraAuth.isAuthenticated();
    }

    /**
     * Clear authentication
     */
    async logout(): Promise<void> {
        await intraAuth.logout();
    }

    /**
     * Get current user information
     * Endpoint: /user/?format=json
     */
    async getCurrentUser(): Promise<IIntraUser> {
        try {
            const data = await this.makeRequest("/user/", "GET");
            return data;
        } catch (error: any) {
            console.error(
                "Get current user error:",
                error.response?.data || error.message,
            );

            // Check for specific error responses
            if (error.response?.status === 503) {
                await intraAuth.clearIntraCookie();
                throw new Error(
                    "Session not authenticated. Please log in again through the WebView.",
                );
            }

            // If 401/403, user needs to re-authenticate
            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                await intraAuth.clearIntraCookie();
                throw new Error("Session expired. Please log in again.");
            }

            // Check if it's the anti-DDoS page
            if (
                error.message &&
                error.message.includes("Anti-DDoS Flood Protection")
            ) {
                await intraAuth.clearIntraCookie();
                throw new Error(
                    "Authentication required. Please complete the login process.",
                );
            }

            throw new Error("Failed to fetch current user information");
        }
    }

    /**
     * Get students from trombi (directory) by location and year
     * Endpoint: /user/filter/user?format=json&location={location}&year={year}&active=true
     */
    async getStudentsByLocation(
        location: string,
        year: number,
    ): Promise<IIntraStudent[]> {
        try {
            const data = await this.makeRequest(
                "/user/filter/user",
                "GET",
                null,
                {
                    location,
                    year,
                    active: true,
                    count: 99999,
                },
            );
            return data.items || data;
        } catch (error: any) {
            console.error(
                "Get students error:",
                error.response?.data || error.message,
            );
            throw new Error("Failed to fetch students from trombi");
        }
    }

    /**
     * Get planning/activities for a specific date and location
     * Endpoint: /planning/load?format=json&location={location}&start={date}&end={date}
     */
    async getActivities(
        location: string,
        startDate: string,
        endDate?: string,
    ): Promise<IIntraEvent[]> {
        try {
            console.log("Fetching activities from Intra API:", {
                location,
                startDate,
                endDate,
            });
            const data = await this.makeRequest("/planning/load", "GET", null, {
                location,
                start: startDate,
                end: endDate || startDate,
            });
            console.log("Activities response:", data?.length || 0, "events");
            return data;
        } catch (error: any) {
            console.error(
                "Get activities error:",
                error.response?.data || error.message,
            );
            console.error("Status:", error.response?.status);
            console.error("Request params:", { location, startDate, endDate });
            throw new Error("Failed to fetch activities");
        }
    }

    /**
     * Get module information and user rights
     * Endpoint: /module/{year}/{module}/{instance}?format=json
     */
    async getModuleInfo(
        scolaryear: string,
        codemodule: string,
        codeinstance: string,
    ): Promise<IIntraModuleInfo> {
        try {
            const data = await this.makeRequest(
                `/module/${scolaryear}/${codemodule}/${codeinstance}`,
                "GET",
            );
            return data;
        } catch (error: any) {
            console.error(
                "Get module info error:",
                error.response?.data || error.message,
            );
            throw new Error("Failed to fetch module information");
        }
    }

    /**
     * Get registered students for a module instance
     * Endpoint: /module/{year}/{module}/{instance}/registered?format=json
     */
    async getModuleRegisteredStudents(
        scolaryear: string,
        codemodule: string,
        codeinstance: string,
    ): Promise<IIntraStudent[]> {
        try {
            const data = await this.makeRequest(
                `/module/${scolaryear}/${codemodule}/${codeinstance}/registered`,
                "GET",
            );
            return data;
        } catch (error: any) {
            console.error(
                "Get module registered students error:",
                error.response?.data || error.message,
            );
            throw new Error("Failed to fetch module registered students");
        }
    }

    /**
     * Get registered students for an event
     * Endpoint: /module/{year}/{module}/{instance}/{acti}/{event}/registered?format=json
     */
    async getRegisteredStudents(event: IIntraEvent): Promise<IIntraStudent[]> {
        try {
            const data = await this.makeRequest(
                `/module/${event.scolaryear}/${event.codemodule}/${event.codeinstance}/${event.codeacti}/${event.codeevent}/registered`,
                "GET",
            );
            return data;
        } catch (error: any) {
            console.error(
                "Get registered students error:",
                error.response?.data || error.message,
            );
            throw new Error("Failed to fetch registered students");
        }
    }

    /**
     * Update student presence for an event
     * Endpoint: /module/{year}/{module}/{instance}/{acti}/{event}/updateregistered?format=json
     * Method: POST
     * Body: items[0][login]=student.login&items[0][present]=present
     */
    async updatePresence(
        event: IIntraEvent,
        presences: IPresenceUpdate[],
    ): Promise<void> {
        try {
            // Build form data body exactly like old project
            let body = "";
            presences.forEach((presence, index) => {
                if (index > 0) body += "&";
                body +=
                    encodeURIComponent(`items[${index}][login]`) +
                    "=" +
                    encodeURIComponent(presence.login) +
                    "&";
                body +=
                    encodeURIComponent(`items[${index}][present]`) +
                    "=" +
                    encodeURIComponent(presence.present);
            });

            const endpoint = `/module/${event.scolaryear}/${event.codemodule}/${event.codeinstance}/${event.codeacti}/${event.codeevent}/updateregistered`;

            console.log("🔥 Updating presence on Intranet:");
            console.log("🔥 Endpoint:", endpoint);
            console.log(
                "🔥 Presences array:",
                JSON.stringify(presences, null, 2),
            );
            console.log("🔥 Raw body:", body);
            console.log("🔥 Decoded body:", decodeURIComponent(body));

            await this.makeRequest(endpoint, "POST", body);

            console.log("✓ Presence update successful");
        } catch (error: any) {
            console.error(
                "Update presence error:",
                error.response?.data || error.message,
            );
            console.error("Status:", error.response?.status);
            console.error("Event details:", {
                scolaryear: event.scolaryear,
                codemodule: event.codemodule,
                codeinstance: event.codeinstance,
                codeacti: event.codeacti,
                codeevent: event.codeevent,
            });

            // Provide more specific error messages
            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                throw new Error(
                    "Session expired or unauthorized. Please log in again.",
                );
            } else if (error.response?.status === 404) {
                throw new Error(
                    "Event not found or you don't have permission to mark presence for this event.",
                );
            } else {
                throw new Error(
                    error.response?.data?.message ||
                        error.message ||
                        "Failed to update presence",
                );
            }
        }
    }

    /**
     * Mark a single student as present
     * Convenience method wrapping updatePresence
     */
    async markStudentPresent(
        event: IIntraEvent,
        studentLogin: string,
    ): Promise<void> {
        console.log("🎯 markStudentPresent called with login:", studentLogin);
        console.log("🎯 Login type:", typeof studentLogin);
        console.log("🎯 Login length:", studentLogin?.length);
        return this.updatePresence(event, [
            {
                login: studentLogin,
                present: "present",
            },
        ]);
    }

    /**
     * Mark a single student as absent
     * Convenience method wrapping updatePresence
     */
    async markStudentAbsent(
        event: IIntraEvent,
        studentLogin: string,
    ): Promise<void> {
        return this.updatePresence(event, [
            {
                login: studentLogin,
                present: "absent",
            },
        ]);
    }

    /**
     * Get student login from email
     * Epitech emails are typically: firstname.lastname@epitech.eu
     * Login is typically: firstname.lastname
     */
    getLoginFromEmail(email: string): string {
        // Extract login from email (everything before @)
        const atIndex = email.indexOf("@");
        if (atIndex === -1) {
            return email;
        }
        return email.substring(0, atIndex);
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        return await intraAuth.isAuthenticated();
    }

    /**
     * Get RDV registrations for an event
     * Endpoint: /module/{year}/{module}/{instance}/{acti}/rdv?format=json
     */
    async getRdvRegistrations(event: IIntraEvent): Promise<any> {
        try {
            const codeActi = event.codeacti.startsWith("acti-")
                ? event.codeacti
                : `acti-${event.codeacti}`;

            const endpoint = `/module/${event.scolaryear}/${event.codemodule}/${event.codeinstance}/${codeActi}/rdv`;

            console.log("[IntraApi] Fetching RDV registrations:", endpoint);
            const data = await this.makeRequest(endpoint, "GET");
            console.log("[IntraApi] ✓ RDV data received");
            return data;
        } catch (error: any) {
            console.error(
                "Get RDV registrations error:",
                error.response?.data || error.message,
            );
            throw new Error("Failed to fetch RDV registrations");
        }
    }

    /**
     * Extract clean project name from RDV data
     * Handles formats like "[B1][MUL]  MyRadar" -> "myradar"
     */
    extractProjectNameFromRdv(rdvData: any): string | null {
        if (!rdvData || !rdvData.project || !rdvData.project.title) {
            return null;
        }

        const projectTitle = rdvData.project.title;
        console.log(
            "[IntraApi] Extracting project name from title:",
            projectTitle,
        );

        // Remove all bracket content and trim
        // Handles: "[B1][MUL]  MyRadar" -> "MyRadar"
        let cleanName = projectTitle.replace(/\[[^\]]*\]/g, "").trim();

        // Convert to lowercase and remove spaces/special chars and underscores
        cleanName = cleanName.toLowerCase().replace(/[\s_]+/g, "");

        console.log("[IntraApi] ✓ Extracted clean project name:", cleanName);
        return cleanName;
    }

    /**
     * Get project information for an activity
     * Endpoint: /module/{year}/{module}/{instance}/{acti}/project?format=json
     */
    async getProjectInfo(event: IIntraEvent): Promise<any> {
        try {
            const activityName = event.codeacti.startsWith("acti-")
                ? event.codeacti
                : `acti-${event.codeacti}`;
            const endpoint = `/module/${event.scolaryear}/${event.codemodule}/${event.codeinstance}/${activityName}/project`;

            console.log("[IntraApi] Fetching project info:", endpoint);
            const data = await this.makeRequest(endpoint, "GET");
            console.log("[IntraApi] ✓ Project data received:", data?.title);
            return data;
        } catch (error: any) {
            console.error(
                "Get project info error:",
                error.response?.data || error.message,
            );
            // Return null if project not found (some activities don't have projects)
            if (error.response?.status === 404) {
                console.warn("[IntraApi] Project not found for activity");
                return null;
            }
            throw new Error("Failed to fetch project information");
        }
    }

    /**
     * Get activity details
     * Endpoint: /module/{year}/{module}/{instance}/{acti}?format=json
     */
    async getActivityDetails(event: IIntraEvent): Promise<any> {
        try {
            const codeActi = event.codeacti.startsWith("acti-")
                ? event.codeacti
                : `acti-${event.codeacti}`;

            const endpoint = `/module/${event.scolaryear}/${event.codemodule}/${event.codeinstance}/${codeActi}`;

            console.log("[IntraApi] Fetching activity details:", endpoint);
            const data = await this.makeRequest(endpoint, "GET");
            console.log("[IntraApi] ✓ Activity data received");
            return data;
        } catch (error: any) {
            if (error.response?.status === 403) {
                console.warn(
                    "[IntraApi] Access forbidden for activity details. User may not have rights to view this activity.\n\tStatus:\t" +
                        (error.response.status) +
                        "\n\tURL:\t" +
                        error.config?.url +
                        (error.response.data.message
                            ? "\n\tLog: "
                            : "\n\tData:\t") +
                            (error.response?.data.message || error.response?.data || error.message || "No additional error data"),
                );
                throw new Error(
                    "You don't have permission to view details of this activity.",
                );
            }
            console.error(
                "Get activity details error:",
                error.response?.data || error.message,
            );
            throw new Error("Failed to fetch activity details");
        }
    }

    /**
     * Get the list of student that can be registered to an event by checking with module registered students
     * Endpoint: /module/{year}/{module}/{instance}/registered
     * Method: GET
     * Returns list of students that can be registered
     * Type :  object
     * The response is an array of objects with the following structure:
     * [{
     *      "course_code": "bachelor/classic",
     *      "credits": 0,
     *      "cycle": "bachelor",
     *      "date_ins": "2026-01-29 22:11:45",
     *      "flags": [],
     *      "grade": "-",
     *      "location": null,
     *      "login": "student.login@school.domain",
     *      "picture": "/file/userprofil/student.login@school.domain.bmp",
     *      "promo": 2028,
     *      "semester": "B5",
     *      "title": "Student Name"
     * }]
     *
     */
    async getRegistrableStudents(event: IIntraEvent): Promise<IIntraStudent[]> {
        try {
            const data = await this.makeRequest(
                `/module/${event.scolaryear}/${event.codemodule}/${event.codeinstance}/registered?format=json`,
                "GET",
            );
            if (__DEV__) {
                console.log("Registrable students data:", data);
            }
            return data;
        } catch (error: any) {
            console.error(
                "Get registrable students error:",
                error.response?.data || error.message,
            );
            throw new Error("Failed to fetch registrable students");
        }
    }

    /**
     * Force register a student for a module
     * Endpoint: /module/{year}/{module}/{instance}/savegrade
     * Method: POST
     * note=%5B%7B%22login%22%3A%22nicolas.toro%40epitech.eu%22%7D%5D&force=false
     * Body: items[0][login]=student.login false
     */
    async forceRegisterStudentModule(
        email: string,
        event: IIntraEvent,
    ): Promise<void> {
        try {
            const noteArray = [{ login: email }];
            const noteParam =
                encodeURIComponent("note") +
                "=" +
                encodeURIComponent(JSON.stringify(noteArray));
            const forceParam =
                encodeURIComponent("force") + "=" + encodeURIComponent("false");
            const body = `${noteParam}&${forceParam}`;

            const endpoint = `/module/${event.scolaryear}/${event.codemodule}/${event.codeinstance}/savegrade`;

            if (__DEV__) {
                console.log("Forcing registration on Intranet:");
                console.log("Endpoint:", endpoint);
                console.log("Raw body:", body);
                console.log("Decoded body:", decodeURIComponent(body));
            }

            try {
                await this.makeRequest(endpoint, "POST", body);
            } catch (postError: any) {
                if (__DEV__) {
                    console.error(
                        "Error during force registration POST:",
                        postError.response?.data || postError.message,
                    );
                }
                throw postError;
            }
        } catch (error: any) {
            if (__DEV__) {
                console.error(
                    "Module : Force register student error:",
                    error.response?.data || error.message,
                );
            }
            throw new Error(
                error.response?.data?.message ||
                    error.message ||
                    "Failed to force register student",
            );
        }
    }

    /**
     * Force register a student for an event
     * Endpoint: /module/{year}/{module}/{instance}/{acti}/{event}/registered?format=json
     * Method: POST
     * Body: items[0][login]=student.login
     */
    async forceRegisterStudentEvent(
        event: IIntraEvent,
        studentLogin: string,
    ): Promise<void> {
        try {
            const body =
                encodeURIComponent(`items[0][login]`) +
                "=" +
                encodeURIComponent(studentLogin);

            const endpoint = `/module/${event.scolaryear}/${event.codemodule}/${event.codeinstance}/${event.codeacti}/${event.codeevent}/updateregistered`;

            const data = await this.getRegistrableStudents(event);

            if (!data.find((student) => student.login === studentLogin)) {
                throw new Error(
                    `Student with login ${studentLogin} cannot be registered for this event.`,
                );
            }

            if (__DEV__) {
                console.log("Forcing registration for activity on Intranet:");
                console.log("Endpoint:", endpoint);
                console.log("Raw body:", body);
                console.log("Decoded body:", decodeURIComponent(body));
            }

            try {
                await this.makeRequest(endpoint, "POST", body);
            } catch (postError: any) {
                if (__DEV__) {
                    console.error(
                        "Error during force registration POST:",
                        postError.response?.data || postError.message,
                    );
                }
                throw postError;
            }
        } catch (error: any) {
            if (__DEV__) {
                console.error(
                    "Event : Force register student error:",
                    error.response?.data || error.message,
                );
            }
            throw new Error(
                error.response?.data?.message ||
                    error.message ||
                    "Failed to force register student",
            );
        }
    }
}

export default new IntraApiService();
