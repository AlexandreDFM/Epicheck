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

export interface IBaremeData {
    response: IBaremeResponse;
    groups: IBaremeGroup[];
    marks: IBaremeMark[];
}
