const normalizeBaseUrl = (value?: string | null, fallback?: string) => {
  const normalized = String(value || '').trim().replace(/\/+$/, '');
  if (normalized) return normalized;
  return String(fallback || '').trim().replace(/\/+$/, '');
};

const getCorsFallbackOrigin = () => (
  String(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .find(Boolean)
);

export const getPublicFrontendBaseUrl = () => normalizeBaseUrl(
  process.env.PUBLIC_FRONTEND_URL || process.env.FRONTEND_URL,
  getCorsFallbackOrigin() || 'http://localhost:5174',
);

export const getDashboardFrontendBaseUrl = () => normalizeBaseUrl(
  process.env.DASHBOARD_FRONTEND_URL || process.env.FRONTEND_URL,
  getCorsFallbackOrigin() || 'http://localhost:5173',
);

const buildFrontendUrl = (
  baseUrl: string,
  path: string,
  params?: Record<string, string | null | undefined>,
) => {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, `${baseUrl}/`);
  Object.entries(params || {}).forEach(([key, rawValue]) => {
    const value = String(rawValue || '').trim();
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

export const buildPublicFrontendUrl = (
  path: string,
  params?: Record<string, string | null | undefined>,
) => buildFrontendUrl(getPublicFrontendBaseUrl(), path, params);

export const buildDashboardFrontendUrl = (
  path: string,
  params?: Record<string, string | null | undefined>,
) => buildFrontendUrl(getDashboardFrontendBaseUrl(), path, params);
