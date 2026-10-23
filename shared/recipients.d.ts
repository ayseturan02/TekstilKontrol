export type SavedRecipient = {id: string; name: string; email: string; isExample: boolean; createdAt: string};
export const defaultRecipients: {name: string; email: string}[];
export function normalizeEmail(value: unknown): string;
export function isValidEmail(value: unknown): boolean;
export function parseSavedEmails(value: string | null | undefined): string[];
export function mergeEmails(saved: string[], added: string[]): string[];
export function mailSubject(report: any): string;
export function mailBody(report: any, mediaCount: number): string;
