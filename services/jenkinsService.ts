/**
 * File Name: jenkinsService.ts
 * Description: Service for managing Jenkins credentials and authentication
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const JENKINS_USERNAME_KEY = "jenkins_username";
const JENKINS_TOKEN_KEY = "jenkins_token";
const JENKINS_BASE_URL_KEY = "jenkins_base_url";

// Storage wrapper for cross-platform compatibility
const storage = {
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === "web") {
            return localStorage.getItem(key);
        }
        return await SecureStore.getItemAsync(key);
    },
    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === "web") {
            localStorage.setItem(key, value);
        } else {
            await SecureStore.setItemAsync(key, value);
        }
    },
    async removeItem(key: string): Promise<void> {
        if (Platform.OS === "web") {
            localStorage.removeItem(key);
        } else {
            await SecureStore.deleteItemAsync(key);
        }
    },
};

class JenkinsService {
    private jenkinsUsername: string | null = null;
    private jenkinsToken: string | null = null;
    private jenkinsBaseUrl: string = "https://jenkins.epitest.eu";

    /**
     * Store Jenkins credentials securely
     */
    async setCredentials(
        username: string,
        token: string,
        baseUrl: string = "https://jenkins.epitest.eu",
    ): Promise<void> {
        try {
            if (!username || !token) {
                throw new Error("Username and token are required");
            }

            await storage.setItem(JENKINS_USERNAME_KEY, username);
            await storage.setItem(JENKINS_TOKEN_KEY, token);
            await storage.setItem(JENKINS_BASE_URL_KEY, baseUrl);

            this.jenkinsUsername = username;
            this.jenkinsToken = token;
            this.jenkinsBaseUrl = baseUrl;

            console.log(
                "[JenkinsService] ✓ Jenkins credentials stored successfully",
            );
        } catch (error) {
            console.error("[JenkinsService] Error storing credentials:", error);
            throw error;
        }
    }

    /**
     * Get stored Jenkins credentials
     */
    async getCredentials(): Promise<{
        username: string | null;
        token: string | null;
        baseUrl: string;
    }> {
        try {
            if (!this.jenkinsUsername) {
                this.jenkinsUsername = await storage.getItem(
                    JENKINS_USERNAME_KEY,
                );
            }
            if (!this.jenkinsToken) {
                this.jenkinsToken = await storage.getItem(JENKINS_TOKEN_KEY);
            }

            const baseUrl = await storage.getItem(JENKINS_BASE_URL_KEY);
            if (baseUrl) {
                this.jenkinsBaseUrl = baseUrl;
            }

            return {
                username: this.jenkinsUsername,
                token: this.jenkinsToken,
                baseUrl: this.jenkinsBaseUrl,
            };
        } catch (error) {
            console.error("[JenkinsService] Error retrieving credentials:", error);
            return {
                username: null,
                token: null,
                baseUrl: this.jenkinsBaseUrl,
            };
        }
    }

    /**
     * Check if Jenkins credentials are configured
     */
    async hasCredentials(): Promise<boolean> {
        try {
            const { username, token } = await this.getCredentials();
            return !!username && !!token;
        } catch (error) {
            console.error("[JenkinsService] Error checking credentials:", error);
            return false;
        }
    }

    /**
     * Clear Jenkins credentials
     */
    async clearCredentials(): Promise<void> {
        try {
            await storage.removeItem(JENKINS_USERNAME_KEY);
            await storage.removeItem(JENKINS_TOKEN_KEY);
            await storage.removeItem(JENKINS_BASE_URL_KEY);

            this.jenkinsUsername = null;
            this.jenkinsToken = null;

            console.log("[JenkinsService] ✓ Jenkins credentials cleared");
        } catch (error) {
            console.error("[JenkinsService] Error clearing credentials:", error);
            throw error;
        }
    }

    /**
     * Get Basic Auth header for Jenkins API calls
     */
    async getAuthHeader(): Promise<string> {
        const { username, token } = await this.getCredentials();

        if (!username || !token) {
            throw new Error("Jenkins credentials not configured");
        }

        const credentials = `${username}:${token}`;
        const encodedCredentials = btoa(credentials);

        return `Basic ${encodedCredentials}`;
    }

    /**
     * Get the Jenkins base URL
     */
    async getBaseUrl(): Promise<string> {
        const { baseUrl } = await this.getCredentials();
        return baseUrl;
    }

    /**
     * Validate Jenkins credentials by making a test API call
     */
    async validateCredentials(): Promise<boolean> {
        try {
            const { username, token, baseUrl } = await this.getCredentials();

            if (!username || !token) {
                return false;
            }

            const credentials = `${username}:${token}`;
            const encodedCredentials = btoa(credentials);

            const response = await fetch(`${baseUrl}/api/json`, {
                method: "GET",
                headers: {
                    Authorization: `Basic ${encodedCredentials}`,
                    "Content-Type": "application/json",
                },
            });

            console.log(
                "[JenkinsService] Validation response status:",
                response.status,
            );
            return response.status === 200;
        } catch (error) {
            console.error("[JenkinsService] Credentials validation failed:", error);
            return false;
        }
    }
}

export default new JenkinsService();
