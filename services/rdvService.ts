/**
 * File Name: rdvService.ts
 * Description: Service to handle RDV (Follow-up) data extraction and parsing.
 */

import { IIntraStudent } from "../types/IIntraStudent";

export interface IRegistration {
    id: string;
    type: "individual" | "group";
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

                    // Only add if we found members
                    if (members.length > 0) {
                        registrations.push({
                            id: slot.id
                                ? slot.id.toString()
                                : `slot-${Math.random()}`,
                            type: members.length > 1 ? "group" : "individual",
                            members: members,
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
