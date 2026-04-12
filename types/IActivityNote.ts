/**
 * File Name: IActivityNote.ts
 * Description: Interface for activity notation data from /note/ endpoint
 */

export interface IActivityNoteIndividuel {
    login: string;
    title?: string;
    note?: string | number;
    comment?: string;
}

export interface IActivityNoteCriterion {
    name: string;
    note?: string | number;
    comment?: string;
}

export interface IActivityNoteGroupMember {
    login: string;
    title?: string;
    picture?: string;
}

export interface IActivityNote {
    login: string;
    title?: string;
    picture?: string;
    note?: string | number | null;
    note_finale?: string | number | null;
    comment?: string;
    grader?: string; // actual API field name from /note/ endpoint
    corrector?: string; // legacy alias — may be absent
    corrector_login?: string;
    correction_date?: string;
    date?: string;
    group?: IActivityNoteGroupMember[];
    individuel?: IActivityNoteIndividuel[];
    notes?: IActivityNoteCriterion[];
    group_status?: string;
}
