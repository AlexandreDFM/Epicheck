/**
 * File Name: IBaremeMark.ts
 * Description: Interface for bareme marks (student/group grades)
 */

export interface IBaremeTeamMember {
    login: string;
    prenom: string;
    nom: string;
    picture: string;
    title: string;
    master: number;
    date_ins: string;
    date_modif: string | null;
}

export interface IBaremePart {
    title: string;
    comments: string;
    marks: string[];
}

export interface IBaremeExercise {
    title: string;
    comments: string;
    parts: IBaremePart[];
}

export interface IBaremeJson {
    introduction: string;
    exercises: IBaremeExercise[];
}

export interface IBaremeResponse {
    scolaryear: string;
    codemodule: string;
    codeinstance: string;
    savable: boolean;
    codegroup: string;
    titlegroup: string;
    team: IBaremeTeamMember[];
    url_acti: string;
    pathname: string;
    referer: string;
    title: string;
    bareme_json: IBaremeJson;
}

export interface IBaremeScale {
    name: string;
    comment?: string;
}

export interface IBaremeQuestion {
    id: string;
    name: string;
    comment: string;
    scales: IBaremeScale[];
}

export interface IBaremeGroup {
    name: string;
    questions: IBaremeQuestion[];
}

export interface IBaremeMark {
    login: string;
    name: string;
    marks: Record<string, string | number | null>; // questionId -> mark
    comment?: string;
}

export interface IBaremeComment {
    login: string;
    name: string;
    comment: string;
}

export interface IBaremeCriterionNote {
    name: string; // criterion key e.g. "Review-Testing-Policy"
    note: string; // the score e.g. "0"
    comment: string; // the comment text
}

export interface IBaremeIndividuelNote {
    note: string;
    comment: string;
    login: string;
}

export interface IBaremeCommentsResponse {
    notes: IBaremeCriterionNote[];
    individuel: IBaremeIndividuelNote[];
    group_status: string;
}

export interface IBaremeCommentsSubmission {
    comments?: { login: string; comment: string }[];
    criteria?: { id: string; name: string; comment: string }[];
    individuel?: { login: string; note: string; comment?: string }[];
    general?: string;
}

export interface IBaremeSaveNote {
    name: string; // criterion key e.g. "Follow-up-Progress"
    note: string; // the score e.g. "40"
    comment: string;
}

export interface IBaremeSavePayload {
    notes: IBaremeSaveNote[];
    individuel: { login: string; note: string; comment: string }[];
    note_finale: string; // sum of all criterion notes as string
    group_status: string; // "present" | "absent"
}

export interface IBaremeData {
    response: IBaremeResponse;
    groups: IBaremeGroup[];
    marks: IBaremeMark[];
}

export interface IBaremeFullLoad {
    baremeData: IBaremeData;
    initialMarks: Record<string, IBaremeMark>;
    criteriaComments: Record<string, string>;
    individuelNotes: Record<string, string>; // login → note "0"-"5"
}
