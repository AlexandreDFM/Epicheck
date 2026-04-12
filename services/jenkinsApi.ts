/**
 * File Name: jenkinsApi.ts
 * Description: API service for interacting with Jenkins API
 */

import jenkinsService from "./jenkinsService";
import axios, { AxiosInstance } from "axios";

interface IJenkinsBuild {
    number: number;
    name: string;
    status: "SUCCESS" | "FAILURE" | "UNSTABLE" | "ABORTED" | "NOT_BUILT";
    timestamp: number;
    duration: number;
    displayName: string;
    url: string;
    description?: string;
}

interface IJenkinsJob {
    name: string;
    url: string;
    color: string;
    lastBuild?: {
        number: number;
        url: string;
    };
    lastSuccessfulBuild?: {
        number: number;
        url: string;
    };
    lastFailedBuild?: {
        number: number;
        url: string;
    };
}

class JenkinsApiService {
    /**
     * Initialize API instance with current credentials
     */
    private async initializeApi(): Promise<AxiosInstance> {
        const baseUrl = await jenkinsService.getBaseUrl();
        const authHeader = await jenkinsService.getAuthHeader();

        return axios.create({
            baseURL: baseUrl,
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
        });
    }

    /**
     * Get job information
     */
    async getJobInfo(jobPath: string): Promise<IJenkinsJob> {
        try {
            const api = await this.initializeApi();
            const response = await api.get(`${jobPath}/api/json`);

            console.log(
                "[JenkinsApi] ✓ Job info retrieved:",
                response.data.name,
            );
            return response.data;
        } catch (error: any) {
            console.error("[JenkinsApi] Error fetching job info:", error);
            throw new Error(
                `Failed to fetch job info: ${error.message || "Unknown error"}`,
            );
        }
    }

    /**
     * Get build information
     */
    async getBuildInfo(
        jobPath: string,
        buildNumber: number,
    ): Promise<IJenkinsBuild> {
        try {
            const api = await this.initializeApi();
            const response = await api.get(
                `${jobPath}/${buildNumber}/api/json`,
            );

            console.log(
                "[JenkinsApi] ✓ Build info retrieved:",
                response.data.displayName,
            );
            return {
                number: response.data.number,
                name: response.data.displayName,
                status: response.data.result || "NOT_BUILT",
                timestamp: response.data.timestamp,
                duration: response.data.duration,
                displayName: response.data.displayName,
                url: response.data.url,
                description: response.data.description,
            };
        } catch (error: any) {
            console.error("[JenkinsApi] Error fetching build info:", error);
            throw new Error(
                `Failed to fetch build info: ${error.message || "Unknown error"}`,
            );
        }
    }

    /**
     * Get last build information
     */
    async getLastBuild(jobPath: string): Promise<IJenkinsBuild> {
        try {
            const api = await this.initializeApi();
            console.log("[JenkinsApi] Fetching last build for job:", jobPath);
            const response = await api.get(
                `${jobPath}/lastBuild/api/json?tree=number,result,timestamp,duration,displayName,url,description`,
            );

            console.log(
                "[JenkinsApi] ✓ Last build retrieved:",
                response.data.displayName,
            );
            return {
                number: response.data.number,
                name: response.data.displayName,
                status: response.data.result || "NOT_BUILT",
                timestamp: response.data.timestamp,
                duration: response.data.duration,
                displayName: response.data.displayName,
                url: response.data.url,
                description: response.data.description,
            };
        } catch (error: any) {
            console.error("[JenkinsApi] Error fetching last build:", error);
            throw new Error(
                `Failed to fetch last build: ${error.message || "Unknown error"}`,
            );
        }
    }

    /**
     * Get last successful build information
     */
    async getLastSuccessfulBuild(jobPath: string): Promise<IJenkinsBuild | null> {
        try {
            const api = await this.initializeApi();
            const response = await api.get(
                `${jobPath}/lastSuccessfulBuild/api/json?tree=number,result,timestamp,duration,displayName,url,description`,
            );

            console.log(
                "[JenkinsApi] ✓ Last successful build retrieved:",
                response.data.displayName,
            );
            return {
                number: response.data.number,
                name: response.data.displayName,
                status: response.data.result || "SUCCESS",
                timestamp: response.data.timestamp,
                duration: response.data.duration,
                displayName: response.data.displayName,
                url: response.data.url,
                description: response.data.description,
            };
        } catch (error: any) {
            console.warn(
                "[JenkinsApi] No last successful build found:",
                error.message,
            );
            return null;
        }
    }

    /**
     * Get build console output
     */
    async getBuildConsoleOutput(
        jobPath: string,
        buildNumber: number,
    ): Promise<string> {
        try {
            const api = await this.initializeApi();
            const response = await api.get(
                `${jobPath}/${buildNumber}/consoleText`,
            );

            console.log("[JenkinsApi] ✓ Console output retrieved");
            return response.data;
        } catch (error: any) {
            console.error("[JenkinsApi] Error fetching console output:", error);
            throw new Error(
                `Failed to fetch console output: ${error.message || "Unknown error"}`,
            );
        }
    }

    /**
     * Trigger a new build
     */
    async triggerBuild(jobPath: string, parameters?: Record<string, string>): Promise<void> {
        try {
            const api = await this.initializeApi();

            let url = `${jobPath}/buildWithParameters`;
            if (!parameters || Object.keys(parameters).length === 0) {
                url = `${jobPath}/build`;
            }

            await api.post(url, null, {
                params: parameters || {},
            });

            console.log("[JenkinsApi] ✓ Build triggered");
        } catch (error: any) {
            console.error("[JenkinsApi] Error triggering build:", error);
            throw new Error(
                `Failed to trigger build: ${error.message || "Unknown error"}`,
            );
        }
    }

    /**
     * Get queue item info
     */
    async getQueueInfo(queueId: number): Promise<any> {
        try {
            const api = await this.initializeApi();
            const response = await api.get(`/queue/item/${queueId}/api/json`);

            console.log("[JenkinsApi] ✓ Queue info retrieved");
            return response.data;
        } catch (error: any) {
            console.error("[JenkinsApi] Error fetching queue info:", error);
            throw new Error(
                `Failed to fetch queue info: ${error.message || "Unknown error"}`,
            );
        }
    }
}

export default new JenkinsApiService();
export type { IJenkinsBuild, IJenkinsJob };
