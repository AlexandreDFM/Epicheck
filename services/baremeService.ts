/**
 * File Name: baremeService.ts
 * Description: Service to handle bareme (grading) data fetching and parsing
 */

import { IIntraEvent } from "../types/IIntraEvent";
import {
    IBaremeData,
    IBaremeMark,
    IBaremeCommentsResponse,
    IBaremeCommentsSubmission,
    IBaremeFullLoad,
    IBaremeSavePayload,
} from "../types/IBaremeMark";
import intraApi from "./intraApi";

class BaremeService {
    /**
     * Fetch bareme marks for a group
     */
    async getBaremeMarks(
        event: IIntraEvent,
        groupName: string,
    ): Promise<IBaremeData> {
        try {
            console.log(
                "[BaremeService] Fetching bareme marks for:",
                groupName,
            );

            const data = await intraApi.getBaremeMarks(event, groupName);
            console.log("[BaremeService] ✓ Bareme data received");

            return this.parseBaremeData(data);
        } catch (error: any) {
            console.error(
                "[BaremeService] Failed to fetch bareme marks:",
                error.message,
            );
            throw new Error("Failed to fetch bareme marks");
        }
    }

    /**
     * Fetch bareme comments for a group
     */
    async getBaremeComments(
        event: IIntraEvent,
        groupName: string,
    ): Promise<IBaremeCommentsResponse> {
        try {
            console.log(
                "[BaremeService] Fetching bareme comments for:",
                groupName,
            );

            const data = await intraApi.getBaremeComments(event, groupName);
            console.log("[BaremeService] ✓ Bareme comments received");

            // Return the full comments response (contains notes, individuel, group_status)
            return data;
        } catch (error: any) {
            console.error(
                "[BaremeService] Failed to fetch bareme comments:",
                error.message,
            );
            throw new Error("Failed to fetch bareme comments");
        }
    }

    /**
     * Load bareme marks and comments in parallel, merge them into a single result.
     * If comments fail, marks are still returned with empty criteria/individual notes.
     */
    async loadFull(
        event: IIntraEvent,
        groupName: string,
    ): Promise<IBaremeFullLoad> {
        const [marksResult, commentsResult] = await Promise.allSettled([
            this.getBaremeMarks(event, groupName),
            this.getBaremeComments(event, groupName),
        ]);

        if (marksResult.status === "rejected") {
            throw marksResult.reason;
        }

        const baremeData = marksResult.value;

        // Build initialMarks keyed by login with deep-copied marks dict
        const initialMarks: Record<string, IBaremeMark> = {};
        baremeData.marks.forEach((mark) => {
            initialMarks[mark.login] = { ...mark, marks: { ...mark.marks } };
        });

        const criteriaComments: Record<string, string> = {};
        const individuelNotes: Record<string, string> = {};

        if (commentsResult.status === "fulfilled") {
            const commentsResponse = commentsResult.value;

            // Populate criteria comments and pre-fill saved note values into initialMarks
            commentsResponse.notes.forEach((note) => {
                criteriaComments[note.name] = note.comment || "";
                if (note.note !== "" && note.note != null) {
                    Object.keys(initialMarks).forEach((login) => {
                        initialMarks[login].marks[note.name] = note.note;
                    });
                }
            });

            // Populate individual star notes
            commentsResponse.individuel.forEach((ind) => {
                individuelNotes[ind.login] = ind.note || "";
            });
        } else {
            console.warn(
                "[BaremeService] Comments unavailable, continuing without:",
                (commentsResult as PromiseRejectedResult).reason?.message,
            );
        }

        return { baremeData, initialMarks, criteriaComments, individuelNotes };
    }

    /**
     * Save all bareme data in one request (marks + comments + individual notes).
     * Endpoint: /bareme/{groupName}/save
     */
    async saveBareme(
        event: IIntraEvent,
        groupName: string,
        payload: IBaremeSavePayload,
    ): Promise<boolean> {
        try {
            console.log("[BaremeService] Saving bareme:", groupName);

            const body = this.formatSavePayload(payload);
            await intraApi.saveBareme(event, groupName, body);

            console.log("[BaremeService] ✓ Bareme saved");
            return true;
        } catch (error: any) {
            console.error(
                "[BaremeService] Failed to save bareme:",
                error.message,
            );
            throw new Error("Failed to save bareme");
        }
    }

    /**
     * Save bareme comments
     */
    async saveBaremeComments(
        event: IIntraEvent,
        groupName: string,
        commentsData: IBaremeCommentsSubmission,
    ): Promise<boolean> {
        try {
            console.log("[BaremeService] Saving bareme comments:", groupName);

            const body = this.formatCommentsForSubmission(commentsData);
            await intraApi.saveBaremeComments(event, groupName, body);
            console.log("[BaremeService] ✓ Bareme comments saved");

            return true;
        } catch (error: any) {
            console.error(
                "[BaremeService] Failed to save bareme comments:",
                error.message,
            );
            throw new Error("Failed to save bareme comments");
        }
    }

    /**
     * Save bareme marks
     */
    async saveBaremeMarks(
        event: IIntraEvent,
        groupName: string,
        marks: IBaremeMark[],
    ): Promise<boolean> {
        try {
            console.log("[BaremeService] Saving bareme marks:", groupName);

            const body = this.formatMarksForSubmission(marks);
            await intraApi.saveBaremeMarks(event, groupName, body);
            console.log("[BaremeService] ✓ Bareme marks saved");

            return true;
        } catch (error: any) {
            console.error(
                "[BaremeService] Failed to save bareme marks:",
                error.message,
            );
            throw new Error("Failed to save bareme marks");
        }
    }

    /**
     * Format IBaremeSavePayload into a URL-encoded string for the /save endpoint.
     * Fields: notes[i][name|note|comment], individuel[i][login|note|comment],
     *         note_finale, group_status
     */
    private formatSavePayload(payload: IBaremeSavePayload): string {
        const parts: string[] = [];

        payload.notes.forEach((note, i) => {
            parts.push(`notes[${i}][name]=${encodeURIComponent(note.name)}`);
            parts.push(`notes[${i}][note]=${encodeURIComponent(note.note)}`);
            parts.push(
                `notes[${i}][comment]=${encodeURIComponent(note.comment ?? "")}`,
            );
        });

        payload.individuel.forEach((ind, i) => {
            parts.push(
                `individuel[${i}][login]=${encodeURIComponent(ind.login)}`,
            );
            parts.push(
                `individuel[${i}][note]=${encodeURIComponent(ind.note ?? "0")}`,
            );
            parts.push(
                `individuel[${i}][comment]=${encodeURIComponent(ind.comment ?? "")}`,
            );
        });

        parts.push(`note_finale=${encodeURIComponent(payload.note_finale)}`);
        parts.push(`group_status=${encodeURIComponent(payload.group_status)}`);

        return parts.join("&");
    }

    /**
     * Format comments for submission to API (URL-encoded string)
     */
    private formatCommentsForSubmission(
        commentsData: IBaremeCommentsSubmission,
    ): string {
        const parts: string[] = [];

        // Add individual member comments
        if (commentsData.comments && Array.isArray(commentsData.comments)) {
            commentsData.comments.forEach((comment: any, index: number) => {
                parts.push(
                    `comments[${index}][login]=${encodeURIComponent(comment.login)}`,
                );
                parts.push(
                    `comments[${index}][comment]=${encodeURIComponent(comment.comment || "")}`,
                );
            });
        }

        // Add criteria comments
        if (commentsData.criteria && Array.isArray(commentsData.criteria)) {
            commentsData.criteria.forEach((criteria, index) => {
                // Use the id as the criterion key (e.g., "Review-Testing-Policy")
                parts.push(
                    `criteria[${index}][name]=${encodeURIComponent(criteria.id)}`,
                );
                parts.push(
                    `criteria[${index}][comment]=${encodeURIComponent(criteria.comment || "")}`,
                );
            });
        }

        // Add individual member notes
        if (commentsData.individuel && Array.isArray(commentsData.individuel)) {
            commentsData.individuel.forEach((ind, index) => {
                parts.push(
                    `individuel[${index}][login]=${encodeURIComponent(ind.login)}`,
                );
                parts.push(
                    `individuel[${index}][note]=${encodeURIComponent(ind.note)}`,
                );
                if (ind.comment) {
                    parts.push(
                        `individuel[${index}][comment]=${encodeURIComponent(ind.comment)}`,
                    );
                }
            });
        }

        // Add general comment if present
        if (commentsData.general) {
            parts.push(`general=${encodeURIComponent(commentsData.general)}`);
        }

        return parts.join("&");
    }

    /**
     * Format marks for submission to API (URL-encoded string)
     */
    private formatMarksForSubmission(marks: IBaremeMark[]): string {
        const parts: string[] = [];

        marks.forEach((mark, index) => {
            parts.push(
                `marks[${index}][login]=${encodeURIComponent(mark.login)}`,
            );
            if (mark.comment) {
                parts.push(
                    `marks[${index}][comment]=${encodeURIComponent(mark.comment)}`,
                );
            }

            // Add individual scale marks
            Object.entries(mark.marks).forEach(([questionId, value]) => {
                if (value !== null) {
                    parts.push(
                        `marks[${index}][marks][${questionId}]=${encodeURIComponent(String(value))}`,
                    );
                }
            });
        });

        return parts.join("&");
    }

    /**
     * Parse raw bareme data from API
     * Handles the actual API response structure
     */
    private parseBaremeData(rawData: any): IBaremeData {
        // Step 1: Parse exercises into groups and questions
        const groups: any[] = [];

        if (
            rawData?.bareme_json?.exercises &&
            Array.isArray(rawData.bareme_json.exercises)
        ) {
            rawData.bareme_json.exercises.forEach((exercise: any) => {
                if (exercise.parts && Array.isArray(exercise.parts)) {
                    exercise.parts.forEach((part: any) => {
                        // Use format "Exercise-Part" with hyphens to match API response keys
                        // e.g. "Review" + "Testing Policy" → "Review-Testing-Policy"
                        const criterionKey =
                            `${exercise.title}-${part.title}`.replace(
                                /\s+/g,
                                "-",
                            );

                        groups.push({
                            name: `${exercise.title} - ${part.title}`,
                            questions: [
                                {
                                    id: criterionKey,
                                    name: part.title,
                                    comment: part.comments || "",
                                    scales: (part.marks || []).map(
                                        (mark: string) => ({
                                            name: mark,
                                        }),
                                    ),
                                },
                            ],
                        });
                    });
                }
            });
        }

        // Step 2: Create marks for each team member
        const marks: any[] = [];
        if (rawData?.team && Array.isArray(rawData.team)) {
            rawData.team.forEach((member: any) => {
                marks.push({
                    login: member.login,
                    name: member.title,
                    marks: {},
                    comment: "",
                });
            });
        }

        return {
            response: rawData,
            groups,
            marks,
        };
    }
}

export default new BaremeService();
