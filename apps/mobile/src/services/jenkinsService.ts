/**
 * File Name: jenkinsService.ts
 * Description: Service for managing Jenkins credentials and authentication
 */

import storage from "./secureStorage";

export const JENKINS_DEFAULT_BASE_URL = "https://jenkins.epitest.eu";

const JENKINS_USERNAME_KEY = "jenkins_username";
const JENKINS_TOKEN_KEY = "jenkins_token";
const JENKINS_BASE_URL_KEY = "jenkins_base_url";

/** Result of a credentials check against Jenkins */
export type JenkinsCredentialStatus = "valid" | "invalid" | "unreachable";

/**
 * Trim the Jenkins URL and refuse anything that is not https: the API token
 * travels in a Basic Authorization header.
 */
export function normalizeJenkinsBaseUrl(url: string): string {
    const trimmed = url.trim().replace(/\/+$/, "");
    if (!/^https:\/\/[^\s/?#]+/i.test(trimmed)) {
        throw new Error("The Jenkins URL must start with https://");
    }
    return trimmed;
}

class JenkinsService {
    private jenkinsUsername: string | null = null;
    private jenkinsToken: string | null = null;
    private jenkinsBaseUrl: string = JENKINS_DEFAULT_BASE_URL;

    /**
     * Store Jenkins credentials securely
     */
    async setCredentials(
        username: string,
        token: string,
        baseUrl: string = JENKINS_DEFAULT_BASE_URL,
    ): Promise<void> {
        try {
            if (!username || !token) {
                throw new Error("Username and token are required");
            }
            baseUrl = normalizeJenkinsBaseUrl(baseUrl);

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
                this.jenkinsUsername =
                    await storage.getItem(JENKINS_USERNAME_KEY);
            }
            if (!this.jenkinsToken) {
                this.jenkinsToken = await storage.getItem(JENKINS_TOKEN_KEY);
            }

            const baseUrl = await storage.getItem(JENKINS_BASE_URL_KEY);
            if (baseUrl) {
                // A URL saved before https was required falls back to the
                // default instance rather than sending the token in clear
                try {
                    this.jenkinsBaseUrl = normalizeJenkinsBaseUrl(baseUrl);
                } catch {
                    this.jenkinsBaseUrl = JENKINS_DEFAULT_BASE_URL;
                }
            }

            return {
                username: this.jenkinsUsername,
                token: this.jenkinsToken,
                baseUrl: this.jenkinsBaseUrl,
            };
        } catch (error) {
            console.error(
                "[JenkinsService] Error retrieving credentials:",
                error,
            );
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
            console.error(
                "[JenkinsService] Error checking credentials:",
                error,
            );
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
            console.error(
                "[JenkinsService] Error clearing credentials:",
                error,
            );
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
     * Check credentials against Jenkins without storing them.
     * "invalid" means Jenkins answered 401/403; "unreachable" covers network
     * errors and any other status.
     */
    async checkCredentials(
        username: string,
        token: string,
        baseUrl: string,
    ): Promise<JenkinsCredentialStatus> {
        try {
            const response = await fetch(
                `${normalizeJenkinsBaseUrl(baseUrl)}/api/json`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Basic ${btoa(`${username}:${token}`)}`,
                        "Content-Type": "application/json",
                    },
                },
            );

            console.log(
                "[JenkinsService] Validation response status:",
                response.status,
            );
            if (response.status === 200) return "valid";
            if (response.status === 401 || response.status === 403) {
                return "invalid";
            }
            return "unreachable";
        } catch (error) {
            console.error(
                "[JenkinsService] Credentials validation failed:",
                error,
            );
            return "unreachable";
        }
    }

    /**
     * Validate the stored Jenkins credentials
     */
    async validateCredentials(): Promise<boolean> {
        const { username, token, baseUrl } = await this.getCredentials();
        if (!username || !token) {
            return false;
        }
        return (
            (await this.checkCredentials(username, token, baseUrl)) === "valid"
        );
    }
}

export default new JenkinsService();
