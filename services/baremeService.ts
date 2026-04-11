/**
 * File Name: baremeService.ts
 * Description: Service to handle bareme (grading) data fetching and parsing
 */

import { IIntraEvent } from "../types/IIntraEvent";
import { IBaremeData, IBaremeMark } from "../types/IBaremeMark";
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
            console.log("[BaremeService] Fetching bareme marks for:", groupName);

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
     * Parse raw bareme data from API
     * Handles the actual API response structure
     */
    private parseBaremeData(rawData: any): IBaremeData {
        // Step 1: Parse exercises into groups and questions
        const groups: any[] = [];

        if (rawData?.bareme_json?.exercises && Array.isArray(rawData.bareme_json.exercises)) {
            rawData.bareme_json.exercises.forEach((exercise: any) => {
                if (exercise.parts && Array.isArray(exercise.parts)) {
                    exercise.parts.forEach((part: any, partIndex: number) => {
                        const questionId = `ex-${exercise.title}-part-${partIndex}`;

                        groups.push({
                            name: `${exercise.title} - ${part.title}`,
                            questions: [
                                {
                                    id: questionId,
                                    name: part.title,
                                    comment: part.comments || "",
                                    scales: (part.marks || []).map((mark: string) => ({
                                        name: mark,
                                    })),
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

            // Format data for submission
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
     * Format marks for submission to API
     */
    private formatMarksForSubmission(marks: IBaremeMark[]): any {
        // Build form data or JSON
        const formData = new FormData();

        marks.forEach((mark, index) => {
            formData.append(`marks[${index}][login]`, mark.login);
            if (mark.comment) {
                formData.append(`marks[${index}][comment]`, mark.comment);
            }

            // Add individual scale marks
            Object.entries(mark.marks).forEach(([questionId, value]) => {
                if (value !== null) {
                    formData.append(
                        `marks[${index}][marks][${questionId}]`,
                        String(value),
                    );
                }
            });
        });

        return formData;
    }
}

export default new BaremeService();
