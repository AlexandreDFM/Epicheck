/**
 * File Name: rdvService.ts
 * Description: Service to handle RDV (Follow-up) data extraction and parsing.
 */

import { IIntraStudent } from "../types/IIntraStudent";
import { IIntraEvent } from "../types/IIntraEvent";

export interface IRegistration {
    id: string;
    title?: string;
    type: "individual" | "group";
    master: IIntraStudent;
    members: IIntraStudent[];
    date?: string;
    note?: number | string | null;
    status?: string;
}

class RdvService {
    /**
     * Returns the JavaScript code to be injected into the WebView.
     * This script extracts the 'launchApp' data from the HTML and sends it back via postMessage.
     */
    getScrapingScript(): string {
        return `
            setTimeout(function() {
                try {
                    var found = false;
                    var scripts = document.querySelectorAll('script');
                    for (var i = 0; i < scripts.length; i++) {
                        var txt = scripts[i].textContent || '';
                        var regex = /launchApp\(['"]module\\.activite\\.rdv['"],\s*(\{[\s\S]*?\})\s*\);/m;
                        var match = txt.match(regex);
                        if (match && match[1]) {
                            var dataObj = eval('(' + match[1] + ')');
                            var jsonStr = JSON.stringify(dataObj);
                            window.ReactNativeWebView.postMessage(jsonStr);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ error: "launchApp data not found in HTML" }));
                    }
                } catch (e) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ error: e.toString() }));
                }
            }, 2000);
            true;
        `;
    }

    /**
     * Parses the raw JSON data extracted from the RDV page into a clean list of registrations.
     * Handles both individual students and project groups.
     *
     * @param rawData The JSON object parsed from the WebView message
     */
    parseRdvData(rawData: any): IRegistration[] {
        const registrations: IRegistration[] = [];

        if (!rawData || !rawData.slots || !Array.isArray(rawData.slots)) {
            return [];
        }

        rawData.slots.forEach((block: any) => {
            if (block.slots && Array.isArray(block.slots)) {
                block.slots.forEach((slot: any) => {
                    const members: IIntraStudent[] = [];

                    // 1. Check for members (Team/Group)
                    if (slot.members && Array.isArray(slot.members)) {
                        slot.members.forEach((member: any) => {
                            members.push(this.mapMemberToStudent(member));
                        });
                    }

                    // 2. Check for master (Team Leader) - add if not already in members
                    if (slot.master) {
                        const exists = members.find(
                            (m) => m.login === slot.master.login,
                        );
                        if (!exists) {
                            members.push(this.mapMemberToStudent(slot.master));
                        }
                    }

                    // 3. Check for single user (Individual RDV)
                    if (slot.user) {
                        const exists = members.find(
                            (m) => m.login === slot.user.login,
                        );
                        if (!exists) {
                            members.push(this.mapMemberToStudent(slot.user));
                        }
                    }

                    // 4. Team name as title if it's a group
                    let title: string | undefined = undefined;
                    if (members.length > 1) {
                        title =
                            slot.title || `Groupe (${members.length} membres)`;
                    } else if (members.length === 1) {
                        title = members[0].title;
                    }

                    // Only add if we found members
                    if (members.length > 0) {
                        registrations.push({
                            id: slot.id
                                ? slot.id.toString()
                                : `slot-${Math.random()}`,
                            type: members.length > 1 ? "group" : "individual",
                            master: this.mapMemberToStudent(slot.master),
                            members: members,
                            title: title,
                            date: slot.date,
                            note: slot.note,
                            status: slot.status,
                        });
                    }
                });
            }
        });

        return registrations;
    }

    /**
     * Builds the group name used as identifier for bareme API calls.
     * Replicates the Intranet's own slug logic:
     *   1. Extract bracket codes [B4][C++] → "B4-C++"
     *   2. Strip the visual " - " separator that Epitech puts between codes and title
     *   3. Combine codes + title
     *   4. Replace whitespace with hyphens
     *   5. Strip any character that is not alphanumeric or a hyphen
     *      (removes +, &, (, ), etc. — e.g. "C++" → "C")
     *   6. Collapse consecutive hyphens into one
     *   7. Trim leading / trailing hyphens
     *
     * Examples:
     *   "[B4][C++] - Arcade"  → "B4-C-Arcade-LYN-4-1-login@epitech.eu"
     *   "[G4][SEC] Hack & Juice" → "G4-SEC-Hack-Juice-LYN-4-1-login@epitech.eu"
     */
    buildGroupName(
        rdvData: any,
        event: IIntraEvent,
        masterLogin: string,
    ): string {
        let projectName = "project";

        if (rdvData?.project?.title) {
            // Step 1: Extract the codes from brackets [B4][C++] → "B4-C++"
            const brackets = rdvData.project.title.match(/\[([^\]]+)\]/g) || [];
            const codes = brackets.map((b: string) => b.slice(1, -1)).join("-");

            // Step 2: Remove brackets then strip any leading " - " separator
            // e.g. "[B4][C++] - Arcade" → " - Arcade" → "Arcade"
            const title = rdvData.project.title
                .replace(/\[[^\]]*\]/g, "")
                .replace(/^\s*-+\s*/, "")
                .trim();

            // Step 3: Combine codes + title
            projectName =
                codes && title
                    ? `${codes}-${title}`
                    : codes || title || "project";
        }

        // Step 4-7: Replicate Intranet slug normalization
        const normalized = projectName
            .replace(/\s+/g, "-") // spaces → hyphens
            .replace(/[^a-zA-Z0-9-]/g, "") // strip special chars (+ & ( ) etc.)
            .replace(/-{2,}/g, "-") // collapse ---  →  -
            .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens

        return `${normalized}-${event.codeinstance}-${masterLogin}`;
    }

    /**
     * Helper to map raw member object to IIntraStudent
     */
    private mapMemberToStudent(rawMember: any): IIntraStudent {
        return {
            login: rawMember.login,
            title: rawMember.title || rawMember.login,
            picture: rawMember.picture,
            present: rawMember.present || "unknown",
        };
    }
}

export default new RdvService();
