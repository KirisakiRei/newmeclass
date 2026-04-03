import { AuthAudience, Role } from '@prisma/client';
import { Request, Response } from 'express';
import { randomBytes } from 'crypto';

type SameSitePolicy = 'lax' | 'strict' | 'none';

const ACCESS_COOKIE_BY_AUDIENCE: Record<AuthAudience, string> = {
  [AuthAudience.USER]: 'nm_user_at',
  [AuthAudience.ADMIN]: 'nm_admin_at',
  [AuthAudience.YAYASAN]: 'nm_yayasan_at',
  [AuthAudience.MITRA]: 'nm_mitra_at',
};

const REFRESH_COOKIE_BY_AUDIENCE: Record<AuthAudience, string> = {
  [AuthAudience.USER]: 'nm_user_rt',
  [AuthAudience.ADMIN]: 'nm_admin_rt',
  [AuthAudience.YAYASAN]: 'nm_yayasan_rt',
  [AuthAudience.MITRA]: 'nm_mitra_rt',
};

export const CSRF_COOKIE_NAME = 'nm_csrf';
export const GOOGLE_STATE_COOKIE_NAME = 'nm_google_oauth_state';
export const GOOGLE_CONTEXT_COOKIE_NAME = 'nm_google_oauth_ctx';
const DEFAULT_CSRF_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const normalizeBooleanEnv = (value: string | undefined, fallback: boolean) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const isLocalHttpOrigin = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return false;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:') return false;
    return ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
};

const shouldRelaxSecureCookiesForLocalhost = () => ([
  process.env.APP_URL,
  process.env.PUBLIC_FRONTEND_URL,
  process.env.DASHBOARD_FRONTEND_URL,
  process.env.CMS_FRONTEND_URL,
].some((value) => isLocalHttpOrigin(value)));

const getCookieSecure = () => {
  const requestedSecure = normalizeBooleanEnv(process.env.AUTH_COOKIE_SECURE, process.env.NODE_ENV === 'production');
  if (!requestedSecure) return false;
  if (shouldRelaxSecureCookiesForLocalhost()) return false;
  return true;
};

const getCookieDomain = () => String(process.env.AUTH_COOKIE_DOMAIN || '').trim() || undefined;

const getCookieSameSite = (): SameSitePolicy => {
  const value = String(process.env.AUTH_COOKIE_SAME_SITE || 'lax').trim().toLowerCase();
  if (value === 'none' || value === 'strict') return value;
  return 'lax';
};

const buildCookieOptions = (maxAgeMs?: number, httpOnly = true) => ({
  httpOnly,
  secure: getCookieSecure(),
  sameSite: getCookieSameSite(),
  domain: getCookieDomain(),
  path: '/',
  ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
});

const normalizeOrigin = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    return new URL(raw).origin.toLowerCase();
  } catch {
    return '';
  }
};

const getAllowedOrigins = () => {
  const values = [
    ...(process.env.CORS_ORIGINS || '').split(','),
    process.env.PUBLIC_FRONTEND_URL || '',
    process.env.DASHBOARD_FRONTEND_URL || '',
    process.env.CMS_FRONTEND_URL || '',
    process.env.APP_URL || '',
  ];

  return Array.from(new Set(values
    .map((value) => normalizeOrigin(value))
    .filter(Boolean)));
};

export const getAccessCookieName = (audience: AuthAudience) => ACCESS_COOKIE_BY_AUDIENCE[audience];

export const getRefreshCookieName = (audience: AuthAudience) => REFRESH_COOKIE_BY_AUDIENCE[audience];

export const resolveAudienceFromRole = (role: Role): AuthAudience => {
  if (role === Role.YAYASAN) return AuthAudience.YAYASAN;
  if (role === Role.MITRA) return AuthAudience.MITRA;
  if (role === Role.ADMIN || role === Role.SUPERADMIN || role === Role.OPERATOR || role === Role.DEVELOPER) {
    return AuthAudience.ADMIN;
  }
  return AuthAudience.USER;
};

const ADMIN_PATH_PREFIXES = [
  '/api/admin',
  '/admin',
  '/api/upload',
  '/upload',
  '/api/landing/cms',
  '/landing/cms',
  '/api/users',
  '/users',
  '/api/payments',
  '/payments',
  '/api/products',
  '/products',
  '/api/media',
  '/media',
  '/api/website-content',
  '/website-content',
  '/api/questions',
  '/questions',
  '/api/personality-results',
  '/personality-results',
  '/api/banners',
  '/banners',
  '/api/transactions',
  '/transactions',
  '/api/analytics',
  '/analytics',
  '/api/articles',
  '/articles',
  '/api/running-info',
  '/running-info',
  '/api/finance',
  '/finance',
  '/api/settings',
  '/settings',
  '/api/yayasan/admin',
  '/yayasan/admin',
  '/api/mitra/admin',
  '/mitra/admin',
  '/api/test-results/admin',
  '/test-results/admin',
];

const YAYASAN_PATH_PREFIXES = [
  '/api/yayasan',
  '/yayasan',
];

const MITRA_PATH_PREFIXES = [
  '/api/mitra',
  '/mitra',
];

export const resolveAudienceFromPath = (path = ''): AuthAudience => {
  const normalizedPath = String(path || '').trim().toLowerCase();
  if (ADMIN_PATH_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) return AuthAudience.ADMIN;
  if (YAYASAN_PATH_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) return AuthAudience.YAYASAN;
  if (MITRA_PATH_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) return AuthAudience.MITRA;
  return AuthAudience.USER;
};

export const issueAuthCookies = (
  res: Response,
  audience: AuthAudience,
  payload: {
    accessToken: string;
    refreshToken: string;
    accessMaxAgeMs: number;
    refreshMaxAgeMs: number;
    csrfToken: string;
  },
) => {
  res.cookie(getAccessCookieName(audience), payload.accessToken, buildCookieOptions(payload.accessMaxAgeMs, true));
  res.cookie(getRefreshCookieName(audience), payload.refreshToken, buildCookieOptions(payload.refreshMaxAgeMs, true));
  res.cookie(CSRF_COOKIE_NAME, payload.csrfToken, buildCookieOptions(payload.refreshMaxAgeMs, false));
};

export const issueStandaloneCsrfCookie = (
  res: Response,
  csrfToken = generateCsrfToken(),
  maxAgeMs = DEFAULT_CSRF_MAX_AGE_MS,
) => {
  res.cookie(CSRF_COOKIE_NAME, csrfToken, buildCookieOptions(maxAgeMs, false));
  return csrfToken;
};

export const clearAuthCookies = (res: Response, audience: AuthAudience) => {
  res.clearCookie(getAccessCookieName(audience), buildCookieOptions(undefined, true));
  res.clearCookie(getRefreshCookieName(audience), buildCookieOptions(undefined, true));
};

export const clearGoogleOauthCookies = (res: Response) => {
  res.clearCookie(GOOGLE_STATE_COOKIE_NAME, buildCookieOptions(undefined, true));
  res.clearCookie(GOOGLE_CONTEXT_COOKIE_NAME, buildCookieOptions(undefined, true));
};

export const issueGoogleOauthCookies = (
  res: Response,
  payload: {
    state: string;
    context: string;
    maxAgeMs: number;
  },
) => {
  res.cookie(GOOGLE_STATE_COOKIE_NAME, payload.state, buildCookieOptions(payload.maxAgeMs, true));
  res.cookie(GOOGLE_CONTEXT_COOKIE_NAME, payload.context, buildCookieOptions(payload.maxAgeMs, true));
};

export const readAccessTokenFromCookies = (req: Request, audience: AuthAudience) =>
  String(req.cookies?.[getAccessCookieName(audience)] || '').trim();

export const readRefreshTokenFromCookies = (req: Request, audience: AuthAudience) =>
  String(req.cookies?.[getRefreshCookieName(audience)] || '').trim();

export const readCsrfToken = (req: Request) =>
  String(req.headers['x-csrf-token'] || req.headers['X-CSRF-Token'] || '').trim();

export const readCsrfCookie = (req: Request) => String(req.cookies?.[CSRF_COOKIE_NAME] || '').trim();

export const validateTrustedOriginRequest = (req: Request) => {
  const method = String(req.method || 'GET').trim().toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.length === 0) return true;

  const directOrigin = normalizeOrigin(String(req.headers.origin || '').trim());
  if (directOrigin) {
    return allowedOrigins.includes(directOrigin);
  }

  const refererOrigin = normalizeOrigin(String(req.headers.referer || '').trim());
  if (refererOrigin) {
    return allowedOrigins.includes(refererOrigin);
  }

  return false;
};

export const validateCsrfRequest = (req: Request) => {
  const method = String(req.method || 'GET').trim().toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
  const headerToken = readCsrfToken(req);
  const cookieToken = readCsrfCookie(req);
  return Boolean(headerToken && cookieToken && headerToken === cookieToken);
};

export const generateCsrfToken = () => randomBytes(24).toString('hex');
