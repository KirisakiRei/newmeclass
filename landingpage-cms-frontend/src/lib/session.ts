const DASHBOARD_URL = String(import.meta.env.VITE_DASHBOARD_URL || '')
  .trim()
  .replace(/\/+$/, '');
const USER_TOKEN_KEY = 'user_token';
const USER_SESSION_EVENT = 'newme-user-session-changed';

export const getDashboardBaseUrl = () => DASHBOARD_URL || 'http://localhost:5173';
export const hasUserSession = () => typeof window !== 'undefined' && Boolean(localStorage.getItem(USER_TOKEN_KEY));
export const emitUserSessionChanged = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(USER_SESSION_EVENT));
};
export const getUserSessionEventName = () => USER_SESSION_EVENT;

export const setUserSession = (token: string, user?: unknown) => {
  localStorage.setItem(USER_TOKEN_KEY, token);
  if (user) {
    localStorage.setItem('user_data', JSON.stringify(user));
  }
  emitUserSessionChanged();
};

export const clearUserSession = () => {
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem('user_data');
  emitUserSessionChanged();
};

export const setAdminSession = (token: string, admin?: unknown) => {
  localStorage.setItem('admin_token', token);
  if (admin) {
    localStorage.setItem('admin_data', JSON.stringify(admin));
  }
};

export const clearAdminSession = () => {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_data');
};

export const buildDashboardBridgeUrl = (ticket: string, targetPath = '/dashboard') => {
  const url = new URL('/auth/bridge', `${getDashboardBaseUrl()}/`);
  url.searchParams.set('ticket', ticket);
  url.searchParams.set('target', targetPath);
  return url.toString();
};
