export type UserProfile = {id: string; firstName: string; lastName: string; email: string; role: 'admin' | 'user'; createdAt?: string};
export type RequestOptions = {token?: string; method?: string; body?: unknown; fetchImpl?: typeof fetch; timeoutMs?: number};
export function apiRequest(api: string, path: string, options?: RequestOptions): Promise<any>;
export function authenticate(email: string, password: string, options?: {api?: string; fetchImpl?: typeof fetch; timeoutMs?: number; onProfile?: (user: UserProfile) => void}): Promise<string>;
export function getProfile(api: string, token: string): Promise<UserProfile>;
