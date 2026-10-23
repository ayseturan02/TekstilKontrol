export type RequestOptions = {method?: string; body?: unknown; fetchImpl?: typeof fetch; timeoutMs?: number};
export function apiRequest(api: string, path: string, options?: RequestOptions): Promise<any>;
