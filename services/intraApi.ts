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
import axios, { AxiosInstance } from "axios";

const INTRA_BASE_URL = "https://intra.epitech.eu";

export interface IntraUser {
    login: string;
    email: string;
    title: string;
    firstname?: string;
    lastname?: string;
    picture: string;
    location?: string;
    promo?: number;
    course?: string;
    credits?: number;
    gpa?: number[];
    groups?: Array<{ name: string }>;
}

export interface IntraStudent {
    login: string;
    title: string;
    picture: string;
    email?: string;
    present?: "present" | "absent" | "N/A" | null;
    differ?: boolean;
}

export interface IntraEvent {
    scolaryear: string;
    codemodule: string;
    codeinstance: string;
    codeacti: string;
    codeevent: string;
    acti_title: string;
    type_code: string;
    start: string;
    end: string;
    nb_group?: number;
    num_event?: number;
    room?: {
        code: string;
        type: string;
    } | null;
    rights?: string[] | null;
    is_rdv?: string;
}

export interface IntraModuleInfo {
    scolaryear: string;
    codemodule: string;
    codeinstance: string;
    title: string;
    rights: string[] | null;
}

export interface PresenceUpdate {
    login: string;
    present: "present" | "absent";
}

class IntraApiService {
    private api: AxiosInstance;

    constructor() {
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
                // Get Intranet cookie and use it as Bearer token (like old project)
                const cookie = await intraAuth.getIntraCookie();

                if (!cookie) {
                    console.warn(
                        "⚠️ No Intranet cookie found. User may need to authenticate."
                    );
                } else {
                    console.log(
                        "✓ Using Intranet cookie for request:",
                        config.url,
                        "| Cookie length:",
                        cookie.length
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
            (error) => Promise.reject(error)
        );

        // Add response interceptor to log errors
        this.api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response) {
                    console.error('Intranet API Error:');
                    console.error('  Status:', error.response.status);
                    console.error('  URL:', error.config?.url);
                    console.error('  Data:', error.response.data);
                }
                return Promise.reject(error);
            }
        );
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
    async getCurrentUser(): Promise<IntraUser> {
        try {
            const response = await this.api.get("/user/");
            return response.data;
        } catch (error: any) {
            console.error(
                "Get current user error:",
                error.response?.data || error.message
            );

            // If 401/403, user needs to re-authenticate
            if (
                error.response?.status === 401 ||
                error.response?.status === 403
            ) {
                await intraAuth.clearIntraCookie();
                throw new Error("Session expired. Please log in again.");
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
        year: number
    ): Promise<IntraStudent[]> {
        try {
            const response = await this.api.get("/user/filter/user", {
                params: {
                    location,
                    year,
                    active: true,
                    count: 99999,
                },
            });
            return response.data.items || response.data;
        } catch (error: any) {
            console.error(
                "Get students error:",
                error.response?.data || error.message
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
        endDate?: string
    ): Promise<IntraEvent[]> {
        try {
            console.log("Fetching activities from Intra API:", {
                location,
                startDate,
                endDate,
            });
            const response = await this.api.get("/planning/load", {
                params: {
                    location,
                    start: startDate,
                    end: endDate || startDate,
                },
            });
            console.log(
                "Activities response:",
                response.data?.length || 0,
                "events"
            );
            return response.data;
        } catch (error: any) {
            console.error(
                "Get activities error:",
                error.response?.data || error.message
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
        codeinstance: string
    ): Promise<IntraModuleInfo> {
        try {
            const response = await this.api.get(
                `/module/${scolaryear}/${codemodule}/${codeinstance}`
            );
            return response.data;
        } catch (error: any) {
            console.error(
                "Get module info error:",
                error.response?.data || error.message
            );
            throw new Error("Failed to fetch module information");
        }
    }

    /**
     * Get registered students for an event
     * Endpoint: /module/{year}/{module}/{instance}/{acti}/{event}/registered?format=json
     */
    async getRegisteredStudents(event: IntraEvent): Promise<IntraStudent[]> {
        try {
            const response = await this.api.get(
                `/module/${event.scolaryear}/${event.codemodule}/${event.codeinstance}/${event.codeacti}/${event.codeevent}/registered`
            );
            return response.data;
        } catch (error: any) {
            console.error(
                "Get registered students error:",
                error.response?.data || error.message
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
        event: IntraEvent,
        presences: PresenceUpdate[]
    ): Promise<void> {
        try {
            // Build form data body exactly like old project
            let body = '';
            presences.forEach((presence, index) => {
                if (index > 0) body += '&';
                body += encodeURIComponent(`items[${index}][login]`) + '=' + encodeURIComponent(presence.login) + '&';
                body += encodeURIComponent(`items[${index}][present]`) + '=' + encodeURIComponent(presence.present);
            });

            const endpoint = `/module/${event.scolaryear}/${event.codemodule}/${event.codeinstance}/${event.codeacti}/${event.codeevent}/updateregistered`;

            console.log('🔥 Updating presence on Intranet:');
            console.log('🔥 Endpoint:', endpoint);
            console.log('🔥 Presences array:', JSON.stringify(presences, null, 2));
            console.log('🔥 Raw body:', body);
            console.log('🔥 Decoded body:', decodeURIComponent(body));

            const response = await this.api.post(
                endpoint,
                body,
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            );

            console.log('✓ Presence update successful:', response.status);
        } catch (error: any) {
            console.error(
                "Update presence error:",
                error.response?.data || error.message
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
            if (error.response?.status === 401 || error.response?.status === 403) {
                throw new Error("Session expired or unauthorized. Please log in again.");
            } else if (error.response?.status === 404) {
                throw new Error("Event not found or you don't have permission to mark presence for this event.");
            } else {
                throw new Error(error.response?.data?.message || error.message || "Failed to update presence");
            }
        }
    }

    /**
     * Mark a single student as present
     * Convenience method wrapping updatePresence
     */
    async markStudentPresent(
        event: IntraEvent,
        studentLogin: string
    ): Promise<void> {
        console.log('🎯 markStudentPresent called with login:', studentLogin);
        console.log('🎯 Login type:', typeof studentLogin);
        console.log('🎯 Login length:', studentLogin?.length);
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
        event: IntraEvent,
        studentLogin: string
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
}

export default new IntraApiService();
