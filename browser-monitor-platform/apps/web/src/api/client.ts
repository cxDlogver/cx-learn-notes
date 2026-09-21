let csrfToken = sessionStorage.getItem('browser-monitor-csrf') ?? '';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function setCsrfToken(value: string): void {
  csrfToken = value;
  sessionStorage.setItem('browser-monitor-csrf', value);
}

export function clearCsrfToken(): void {
  csrfToken = '';
  sessionStorage.removeItem('browser-monitor-csrf');
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method?.toUpperCase() ?? 'GET';
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      ...(!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken
        ? { 'x-csrf-token': csrfToken }
        : {}),
      ...init.headers,
    },
  });

  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof body.code === 'string' ? body.code : 'request_failed',
      typeof body.message === 'string' ? body.message : `Request failed with ${response.status}`,
    );
  }
  return body as T;
}

export function queryString(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

