const normalizeBase = (value?: string | null) => String(value || '').trim().replace(/\/+$/, '');

export const getFrontendOrigin = () => {
  const configured = normalizeBase(process.env.REACT_APP_FRONTEND_URL || process.env.REACT_APP_SITE_URL);
  if (configured) return configured;

  if (typeof window === 'undefined') return 'http://localhost:5173';

  const { protocol, hostname, port, origin } = window.location;
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && port === '5000') {
    return `${protocol}//${hostname}:5173`;
  }

  return origin;
};

export const buildFrontendUrl = (path: string, query: Record<string, string | number | null | undefined> = {}) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(normalizedPath, `${getFrontendOrigin()}/`);

  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || String(value).trim() === '') return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
};
