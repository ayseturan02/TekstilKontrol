export type SavedRecipient = {id: string; name: string; email: string; isExample: boolean; createdAt: string};
export const defaultRecipients: {name: string; email: string}[];
export function normalizeEmail(value: unknown): string;
export function isValidEmail(value: unknown): boolean;
