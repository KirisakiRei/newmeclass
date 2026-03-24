const DASHBOARD_URL = String(import.meta.env.VITE_DASHBOARD_URL || '')
  .trim()
  .replace(/\/+$/, '');

export const getDashboardBaseUrl = () => DASHBOARD_URL || 'http://localhost:5173';

export const setUserSession = (token: string, user?: unknown) => {
  localStorage.setItem('user_token', token);
  if (user) {
    localStorage.setItem('user_data', JSON.stringify(user));
  }
};

export const clearUserSession = () => {
  localStorage.removeItem('user_token');
  localStorage.removeItem('user_data');
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
