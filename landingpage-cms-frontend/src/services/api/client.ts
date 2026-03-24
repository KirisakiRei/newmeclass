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

const extractPayload = (payload: any) => (
  payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'data')
    ? payload.data
    : payload
);

const extractMessage = (payload: any, fallback = 'Terjadi kesalahan') => (
  String(payload?.message || payload?.error || fallback).trim()
);

export const request = async <T = any>(path: string, options: RequestOptions = {}): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = options.tokenKey ? localStorage.getItem(options.tokenKey) : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
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
    throw error;
  }

  return payload as T;
};

export const upload = async <T = any>(
  path: string,
  formData: FormData,
  tokenKey: 'admin_token' | 'user_token' = 'admin_token',
): Promise<T> => {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem(tokenKey);
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
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
    throw error;
  }

  return payload as T;
};
