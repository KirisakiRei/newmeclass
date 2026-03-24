const BACKEND_BASE_URL = String(import.meta.env.VITE_BACKEND_URL || '')
  .trim()
  .replace(/\/+$/, '');

export const resolveBackendAssetUrl = (value?: string | null, fallback = '') => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^(https?:)?\/\//i.test(raw) || raw.startsWith('data:')) {
    return raw;
  }
  if (raw.startsWith('/')) {
    return BACKEND_BASE_URL ? `${BACKEND_BASE_URL}${raw}` : raw;
  }
  return raw;
};
