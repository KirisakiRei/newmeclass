export type RequestOptions = {
  method?: string;
  body?: unknown;
  tokenKey?: 'user_token' | 'admin_token';
  headers?: Record<string, string>;
};

const API_BASE_URL = String(import.meta.env.VITE_BACKEND_URL || '')
  .trim()
  .replace(/\/+$/, '');

export const BACKEND_BASE_URL = API_BASE_URL;
export const API_URL = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';
const DEDUPED_SESSION_PATHS = new Set(['/auth/session', '/admin/session']);
const inflightRequests = new Map<string, Promise<unknown>>();

const extractPayload = (payload: any) => (
  payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')
    ? payload.data
    : payload
);

const extractMessage = (payload: any, fallback = 'Terjadi kesalahan') => {
  const detail = payload?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(payload?.messages)) {
    const combined = payload.messages.map((item: unknown) => String(item || '').trim()).filter(Boolean).join('. ');
    if (combined) return combined;
  }

  const message = String(payload?.message || payload?.error || fallback).trim();
  return message || fallback;
};

const getCsrfToken = () => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)nm_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
};

export const request = async <T = any>(path: string, options: RequestOptions = {}): Promise<T> => {
  const method = String(options.method || 'GET').toUpperCase();
  const requestKey = method === 'GET' && DEDUPED_SESSION_PATHS.has(path)
    ? `${method}:${path}`
    : '';

  if (requestKey && inflightRequests.has(requestKey)) {
    return inflightRequests.get(requestKey) as Promise<T>;
  }

  const executeRequest = async (): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const csrfToken = getCsrfToken();
  if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });

  const rawText = await response.text();
  let parsed: any = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = rawText ? { message: rawText } : null;
  }
  const payload = extractPayload(parsed);

  if (!response.ok || parsed?.success === false) {
    const error = new Error(extractMessage(parsed));
    (error as Error & { status?: number; payload?: unknown }).status = response.status;
    (error as Error & { status?: number; payload?: unknown }).payload = parsed;
    (error as Error & { code?: string }).code = typeof parsed?.error === 'string' ? parsed.error : undefined;
    throw error;
  }

  return payload as T;
  };

  const requestPromise = executeRequest().finally(() => {
    if (requestKey) {
      inflightRequests.delete(requestKey);
    }
  });

  if (requestKey) {
    inflightRequests.set(requestKey, requestPromise);
  }

  return requestPromise;
};

export const upload = async <T = any>(
  path: string,
  formData: FormData,
  tokenKey: 'admin_token' | 'user_token' = 'admin_token',
): Promise<T> => {
  const headers: Record<string, string> = {};
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  const rawText = await response.text();
  let parsed: any = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsed = rawText ? { message: rawText } : null;
  }
  const payload = extractPayload(parsed);

  if (!response.ok || parsed?.success === false) {
    const error = new Error(extractMessage(parsed));
    (error as Error & { status?: number; payload?: unknown }).status = response.status;
    (error as Error & { status?: number; payload?: unknown }).payload = parsed;
    (error as Error & { code?: string }).code = typeof parsed?.error === 'string' ? parsed.error : undefined;
    throw error;
  }

  return payload as T;
};
