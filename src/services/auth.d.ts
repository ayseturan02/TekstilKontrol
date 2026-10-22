export function authenticate(email: string, password: string, options?: {api?: string; fetchImpl?: typeof fetch; timeoutMs?: number}): Promise<string>;
