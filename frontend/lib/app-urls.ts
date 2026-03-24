const normalizeBaseUrl = (value, fallback) => {
  const normalized = String(value || '').trim().replace(/\/+$/, '');
  if (normalized) return normalized;
  return String(fallback || '').trim().replace(/\/+$/, '');
};

export const getPublicWebBaseUrl = () => normalizeBaseUrl(
  process.env.REACT_APP_PUBLIC_WEB_URL,
  'http://localhost:5174',
);

export const getDashboardAppBaseUrl = () => normalizeBaseUrl(
  process.env.REACT_APP_DASHBOARD_URL,
  'http://localhost:5173',
);

export const buildPublicWebUrl = (path = '/', search = '') => {
  const url = new URL(path.startsWith('/') ? path : `/${path}`, `${getPublicWebBaseUrl()}/`);
  if (search) {
    const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
    params.forEach((value, key) => {
      url.searchParams.append(key, value);
    });
  }
  return url.toString();
};
