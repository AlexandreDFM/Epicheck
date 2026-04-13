/**
 * File Name: epitechApi.ts
 * Author: Alexandre Kévin DE FREITAS MARTINS
 * Creation Date: 29/10/2025
 * Description: This is the epitechApi.ts
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

import intraApi from "./intraApi";
import axios, { AxiosInstance } from "axios";
import { IIntraEvent } from "../types/IIntraEvent";
import type { IUserInfo } from "../types/IUserInfo";
import type { IAuthCredentials } from "../types/IAuthCredentials";

const API_BASE_URL = "https://my.epitech.eu/api";

class EpitechApiService {
    private api: AxiosInstance;
    private authToken: string | null = null;

    constructor() {
        this.api = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                "Content-Type": "application/json",
            },
        });

        // Add request interceptor to include auth token
        this.api.interceptors.request.use(
            (config) => {
                if (this.authToken) {
                    config.headers.Authorization = `Bearer ${this.authToken}`;
                }
                return config;
            },
            (error) => Promise.reject(error),
        );
    }

    /**
     * Authenticate user with Epitech credentials (Legacy - kept for backwards compatibility)
     */
    async login(credentials: IAuthCredentials): Promise<IUserInfo> {
        try {
            const response = await this.api.post("/auth/login", credentials);

            if (response.data.token) {
                this.authToken = response.data.token;
            }

            return response.data.user;
        } catch (error: any) {
            console.error(
                "Login error:",
                error.response?.data || error.message,
            );
            throw new Error(
                error.response?.data?.message || "Authentication failed",
            );
        }
    }

    /**
     * Set Office 365 access token for authentication
     * Use this after Office 365 login
     */
    setOffice365Token(accessToken: string): void {
        this.authToken = accessToken;
    } /**
     * Get current user information
     */
    async getIUserInfo(): Promise<IUserInfo> {
        try {
            const response = await this.api.get("/user");
            return response.data;
        } catch (error: any) {
            console.error(
                "Get user info error:",
                error.response?.data || error.message,
            );
            throw new Error("Failed to fetch user information");
        }
    }

    /**
     * Mark student presence using Intranet API
     * Requires an event context to mark presence
     */
    async markPresence(
        studentEmail: string,
        event?: IIntraEvent,
    ): Promise<any> {
        try {
            if (__DEV__) {
                console.log("Marking presence for:", studentEmail);
                console.log("Event:", event ? event.acti_title : "No event");
            }
            const login = intraApi.getLoginFromEmail(studentEmail);
            if (__DEV__) {
                console.log("Extracted login:", login);
            }

            if (!event) {
                throw new Error(
                    "Event context required to mark presence. Please select an activity first.",
                );
            }

            // Fetch registered students and resolve login
            if (__DEV__) {
                console.log("📋 Checking if student is registered for event...");
            }
            const registeredStudents =
                await intraApi.getRegisteredStudents(event);
            if (__DEV__) {
                console.log(
                    `📋 Found ${registeredStudents.length} registered students`,
                );
            }

            const actualLogin = this.findStudentLogin(
                studentEmail,
                registeredStudents,
            );

            if (!actualLogin) {
                if (__DEV__) {
                    console.error(
                        "Student not found in registered list:",
                        studentEmail,
                    );
                    console.log("Registered students:", registeredStudents);
                }
                throw new Error(
                    `Student not found in registered list.\n\n` +
                        `Scanned: ${studentEmail}\n` +
                        `Login: ${login}\n\n` +
                        `This student might not be registered for: ${event.acti_title}\n\n` +
                        `Registered students: ${registeredStudents.length} total`,
                );
            }

            if (__DEV__) {
                console.log(
                    "✅ Using login for marking:",
                    actualLogin,
                );
            }

            await intraApi.markStudentPresent(event, actualLogin);

            if (__DEV__) {
                console.log(
                    `✓ Marked ${actualLogin} present for event: ${event.acti_title}`,
                );
            }

            return {
                success: true,
                studentEmail,
                login: actualLogin,
                event: event.acti_title,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            if (__DEV__) {
                console.error(
                    "Mark presence error:",
                    error.response?.data || error.message,
                );
            }
            throw new Error(
                error.response?.data?.message ||
                    error.message ||
                    "Failed to mark presence",
            );
        }
    }

    /**
     * Resolve a student email to the exact login from the registered list.
     * Returns null if the student is not found.
     */
    private findStudentLogin(
        studentEmail: string,
        registeredStudents: { login: string; email?: string }[],
    ): string | null {
        const login = intraApi.getLoginFromEmail(studentEmail);

        const student = registeredStudents.find((s) => {
            if (s.login === login) return true;
            if (s.login === studentEmail) return true;
            if (s.email === studentEmail) return true;
            if (s.login === `${login}@epitech.eu`) return true;
            const studentLoginWithoutDomain = s.login?.split("@")[0];
            if (studentLoginWithoutDomain === login) return true;
            return false;
        });

        return student ? student.login : null;
    }

    /**
     * Mark multiple students as present in a single batch request.
     * Fetches the registered student list only ONCE, resolves all logins,
     * optionally handles force-registration, then sends a single batch call.
     *
     * Returns per-student results with success/error status.
     */
    async markPresenceBatch(
        studentEmails: string[],
        event: IIntraEvent,
        options?: { registerMode?: boolean },
    ): Promise<
        {
            email: string;
            login: string | null;
            success: boolean;
            error?: string;
        }[]
    > {
        if (!event) {
            throw new Error(
                "Event context required to mark presence. Please select an activity first.",
            );
        }

        const results: {
            email: string;
            login: string | null;
            success: boolean;
            error?: string;
        }[] = [];

        try {
            // 1. Fetch registered students ONCE
            if (__DEV__) {
                console.log(
                    `📦 Batch: fetching registered students for ${event.acti_title}`,
                );
            }

            const registeredStudents =
                await intraApi.getRegisteredStudents(event);

            // 2. If register mode, also fetch module registered students once
            let moduleRegisteredStudents: { login: string; email?: string }[] =
                [];
            if (options?.registerMode) {
                moduleRegisteredStudents =
                    await intraApi.getModuleRegisteredStudents(
                        event.scolaryear,
                        event.codemodule,
                        event.codeinstance,
                    );
            }

            // 3. Resolve logins and handle registrations
            const loginsToMark: string[] = [];
            let currentRegistered = [...registeredStudents];

            for (const email of studentEmails) {
                try {
                    let resolvedLogin = this.findStudentLogin(
                        email,
                        currentRegistered,
                    );

                    // Handle register mode: register student if not in event
                    if (!resolvedLogin && options?.registerMode) {
                        const isOnModule = this.findStudentLogin(
                            email,
                            moduleRegisteredStudents,
                        );

                        if (!isOnModule) {
                            // Register to module first
                            await intraApi.forceRegisterStudentModule(
                                email,
                                event,
                            );
                        }

                        // Register to event
                        await intraApi.forceRegisterStudentEvent(event, email);

                        // Re-fetch registered students to get updated list
                        currentRegistered =
                            await intraApi.getRegisteredStudents(event);
                        resolvedLogin = this.findStudentLogin(
                            email,
                            currentRegistered,
                        );
                    }

                    if (!resolvedLogin) {
                        results.push({
                            email,
                            login: null,
                            success: false,
                            error: `Student not found in registered list for: ${event.acti_title}`,
                        });
                        continue;
                    }

                    loginsToMark.push(resolvedLogin);
                    results.push({
                        email,
                        login: resolvedLogin,
                        success: true,
                    });
                } catch (regError: any) {
                    results.push({
                        email,
                        login: null,
                        success: false,
                        error: regError.message || "Registration failed",
                    });
                }
            }

            // 4. Send ONE batch request for all resolved logins
            if (loginsToMark.length > 0) {
                if (__DEV__) {
                    console.log(
                        `📦 Batch: marking ${loginsToMark.length} students present in one request`,
                    );
                }
                await intraApi.markStudentsPresentBatch(event, loginsToMark);
                if (__DEV__) {
                    console.log(`✓ Batch presence update successful`);
                }
            }

            return results;
        } catch (error: any) {
            if (__DEV__) {
                console.error(
                    "Batch mark presence error:",
                    error.response?.data || error.message,
                );
            }
            // If the batch call itself fails, mark all as failed
            return studentEmails.map((email) => ({
                email,
                login: null,
                success: false,
                error: error.message || "Batch presence update failed",
            }));
        }
    }

    /**
     * Check if a student is registered on a specific module
     */
    async isStudentRegisteredOnModule(
        studentEmail: string,
        event: IIntraEvent,
    ): Promise<boolean> {
        try {
            const login = intraApi.getLoginFromEmail(studentEmail);

            const registeredStudents =
                await intraApi.getModuleRegisteredStudents(
                    event.scolaryear,
                    event.codemodule,
                    event.codeinstance,
                );

            if (__DEV__) {
                console.log("Registered Students for module:", registeredStudents);
            }

            const registeredStudentsList = registeredStudents;

            const student = registeredStudentsList.find((s) => {
                return (
                    s.login === login ||
                    s.login === studentEmail ||
                    s.email === studentEmail ||
                    s.login === `${login}@epitech.eu` ||
                    s.login?.split("@")[0] === login
                );
            });

            return !!student;
        } catch (error: any) {
            console.error(
                "Check student registration to module error:",
                error.response?.data || error.message,
            );
            throw new Error(
                error.response?.data?.message ||
                    error.message ||
                    "Failed to check student registration to module",
            );
        }
    }

    /**
     * Check if a student is registered on a specific event
     */
    async isStudentRegisteredToTheEvent(
        studentEmail: string,
        event: IIntraEvent,
    ): Promise<boolean> {
        try {
            const login = intraApi.getLoginFromEmail(studentEmail);

            const registeredStudents =
                await intraApi.getRegisteredStudents(event);

            if (__DEV__) {
                console.log("Type :", typeof registeredStudents);
                console.log("Registered Students :", registeredStudents);
            }

            const student = registeredStudents.find((s) => {
                return (
                    s.login === login ||
                    s.login === studentEmail ||
                    s.email === studentEmail ||
                    s.login === `${login}@epitech.eu` ||
                    s.login?.split("@")[0] === login
                );
            });

            return !!student;
        } catch (error: any) {
            if (__DEV__) {
                console.error(
                    "Check student registration error:",
                    error.response?.data || error.message,
                );
            }
            throw new Error(
                error.response?.data?.message ||
                    error.message ||
                    "Failed to check student registration",
            );
        }
    }

    /**
     * Force register a student for a module using Intranet API
     */
    async forceRegisterStudentModule(
        email: string,
        event: IIntraEvent,
    ): Promise<any> {
        try {
            if (__DEV__) {
                console.log("Registering student for:", email);
                console.log("Event:", event ? event.acti_title : "No event");
                console.log(
                    "📤 Calling intraApi.forceRegisterStudent with login:",
                    email,
                );
            }

            await intraApi.forceRegisterStudentModule(email, event);

            if (__DEV__) {
                console.log(`✓ Registered ${email} for event: ${event.acti_title}`);
            }

            return {
                success: true,
                studentEmail: email,
                login: email,
                event: event.acti_title,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            if (__DEV__) {
                console.error(
                    "Register student error:",
                    error.response?.data || error.message,
                );
            }
            throw new Error(
                error.response?.data?.message ||
                    error.message ||
                    "Failed to register student",
            );
        }
    }

    /**
     * Force register a student for an event using Intranet API
     */
    async forceRegisterStudentEvent(
        studentEmail: string,
        event: IIntraEvent,
    ): Promise<any> {
        try {
            if (__DEV__) {
                console.log("Registering student for:", studentEmail);
                console.log("Event:", event ? event.acti_title : "No event");
                console.log(
                    "📤 Calling intraApi.forceRegisterStudent with login:",
                    studentEmail,
                );
            }

            await intraApi.forceRegisterStudentEvent(event, studentEmail);

            if (__DEV__) {
                console.log(
                    `✓ Registered ${studentEmail} for event: ${event.acti_title}`,
                );
            }

            return {
                success: true,
                studentEmail,
                login: studentEmail,
                event: event.acti_title,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            if (__DEV__) {
                console.error(
                    "Register student error:",
                    error.response?.data || error.message,
                );
            }
            throw new Error(
                error.response?.data?.message ||
                    error.message ||
                    "Failed to register student",
            );
        }
    }

    /**
     * Get student information by email
     */
    async getStudentByEmail(email: string): Promise<any> {
        try {
            const response = await this.api.get(
                `/students/${encodeURIComponent(email)}`,
            );
            return response.data;
        } catch (error: any) {
            console.error(
                "Get student error:",
                error.response?.data || error.message,
            );
            throw new Error("Student not found");
        }
    }

    /**
     * Get presence list
     */
    async getPresenceList(): Promise<any[]> {
        try {
            const response = await this.api.get("/presence");
            return response.data;
        } catch (error: any) {
            console.error(
                "Get presence list error:",
                error.response?.data || error.message,
            );
            throw new Error("Failed to fetch presence list");
        }
    }

    /**
     * Logout and clear authentication
     */
    logout(): void {
        this.authToken = null;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return this.authToken !== null;
    }

    /**
     * Set authentication token manually
     */
    setAuthToken(token: string): void {
        this.authToken = token;
    }

    /**
     * Get current auth token
     */
    getAuthToken(): string | null {
        return this.authToken;
    }

    /**
     * Get activities for a specific date from Intra
     */
    async getActivitiesForDate(date: Date): Promise<IIntraEvent[]> {
        try {
            // Get current user to get location
            const user = await intraApi.getCurrentUser();

            if (!user.location) {
                throw new Error("User location not found");
            }

            // Get date in YYYY-MM-DD format (padded with zeros)
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const dateStr = `${year}-${month}-${day}`;

            console.log(
                "Fetching activities for date:",
                dateStr,
                "location:",
                user.location,
            );

            const activities = await intraApi.getActivities(
                user.location,
                dateStr,
            );

            // Enrich activities with details (subtitle, description, etc.)
            const enriched = await this.enrichActivitiesWithDetails(activities);

            return enriched;
        } catch (error: any) {
            console.error(
                "Get activities error:",
                error.response?.data || error.message,
            );
            throw new Error("Failed to fetch activities");
        }
    }

    /**
     * Enrich activities with details from the activity detail endpoint.
     * Groups by unique activity to avoid duplicate requests.
     */
    private async enrichActivitiesWithDetails(
        activities: IIntraEvent[],
    ): Promise<IIntraEvent[]> {
        try {
            // Group activities by unique activity key to avoid duplicate fetches
            const uniqueKeys = new Map<string, IIntraEvent>();
            if (!Array.isArray(activities)) {
                console.warn("[EpitechApi] Activities is not an array:", activities);
                return activities;
            }

            for (const event of activities) {
                if (!event || !event.scolaryear) {
                    console.warn("[EpitechApi] Invalid event:", event);
                    continue;
                }
                const key = `${event.scolaryear}/${event.codemodule}/${event.codeinstance}/${event.codeacti}`;
                if (!uniqueKeys.has(key)) {
                    uniqueKeys.set(key, event);
                }
            }

            // Fetch details for each unique activity in parallel
            const detailsMap = new Map<string, any>();
            if (!(uniqueKeys instanceof Map)) {
                throw new Error("uniqueKeys is not a Map");
            }

            const fetchPromises = Array.from(uniqueKeys.entries()).map(
                async ([key, event]) => {
                    try {
                        const details =
                            await intraApi.getActivityDetails(event);
                        detailsMap.set(key, details);
                    } catch (err) {
                        console.warn(
                            `[EpitechApi] Failed to fetch details for ${key}:`,
                            err,
                        );
                    }
                },
            );
            await Promise.all(fetchPromises);

            // Merge detail fields into each activity
            return activities.map((event) => {
                const key = `${event.scolaryear}/${event.codemodule}/${event.codeinstance}/${event.codeacti}`;
                const details = detailsMap.get(key);
                if (!details) return event;

                // Find matching event in the events array to get its title (subtitle)
                const matchingEvent = details.events?.find(
                    (e: any) => e.code === event.codeevent,
                );

                // Extract assistants from the matching event, excluding duplicates already in prof_inst
                const rawAssistants = Array.isArray(
                    matchingEvent?.assistants,
                )
                    ? matchingEvent.assistants
                    : [];
                const profLogins = new Set(
                    (event.prof_inst || []).map((p: any) => p.login),
                );
                const deduped = rawAssistants.filter(
                    (a: any) => !profLogins.has(a.login),
                );
                // null = assistants exist but all are duplicates of prof_inst (don't show "No assistant")
                // undefined = no assistant data at all (show "No assistant")
                const assistants =
                    deduped.length > 0
                        ? deduped
                        : rawAssistants.length > 0
                          ? null
                          : undefined;

                return {
                    ...event,
                    description: details.description || undefined,
                    event_subtitle: matchingEvent?.title || undefined,
                    assistants: assistants,
                    nb_planified: details.nb_planified ?? undefined,
                    nb_registered: details.nb_registered ?? undefined,
                    is_projet: details.is_projet ?? undefined,
                    allow_token: details.allow_token ?? undefined,
                    project_title: details.project_title || undefined,
                    instance_location: details.instance_location || undefined,
                    nb_hours: details.nb_hours || undefined,
                    module_title: details.module_title || undefined,
                    begin: details.begin || undefined,
                    end_register: details.end_register || undefined,
                    deadline: details.deadline || undefined,
            };
            });
        } catch (error) {
            console.error(
                "[EpitechApi] Error enriching activities with details:",
                error,
            );
            console.error("Error details:", (error as any)?.message);
            // Return original activities without enrichment on error
            return activities;
        }
    }

    /**
     * Get today's activities from Intra
     */
    async getTodayActivities(): Promise<IIntraEvent[]> {
        try {
            // Get current user to get location
            const user = await intraApi.getCurrentUser();

            if (!user.location) {
                throw new Error("User location not found");
            }

            // Get today's date in YYYY-MM-DD format (padded with zeros)
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, "0");
            const day = String(today.getDate()).padStart(2, "0");
            const dateStr = `${year}-${month}-${day}`;

            console.log(
                "Fetching activities for date:",
                dateStr,
                "location:",
                user.location,
            );

            const activities = await intraApi.getActivities(
                user.location,
                dateStr,
            );

            // Enrich activities with details (subtitle, description, etc.)
            const enriched = await this.enrichActivitiesWithDetails(activities);

            return enriched;
        } catch (error: any) {
            console.error(
                "Get today activities error:",
                error.response?.data || error.message,
            );
            throw new Error("Failed to fetch today's activities");
        }
    }

    /**
     * Get registered students for an event
     */
    async getEventStudents(event: IIntraEvent): Promise<any[]> {
        try {
            return await intraApi.getRegisteredStudents(event);
        } catch (error: any) {
            console.error(
                "Get event students error:",
                error.response?.data || error.message,
            );
            throw new Error("Failed to fetch event students");
        }
    }

    /**
     * Get current user from Intra
     */
    async getIIntraUser(): Promise<IUserInfo> {
        try {
            const user = await intraApi.getCurrentUser();
            return {
                email: user.email,
                login: user.login,
                title: user.title,
                picture: user.picture,
            };
        } catch (error: any) {
            console.error(
                "Get intra user error:",
                error.response?.data || error.message,
            );
            throw new Error("Failed to fetch intra user");
        }
    }
}

export default new EpitechApiService();
