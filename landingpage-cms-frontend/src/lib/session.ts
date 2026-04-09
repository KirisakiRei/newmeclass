const DASHBOARD_URL = String(import.meta.env.VITE_DASHBOARD_URL || '')
  .trim()
  .replace(/\/+$/, '');
const USER_SESSION_EVENT = 'newme-user-session-changed';
const ADMIN_SESSION_EVENT = 'newme-admin-session-changed';
const AUTH_CHANNEL_NAME = 'newme-auth-channel';
const LEGACY_LOCAL_STORAGE_KEYS = ['user_data', 'admin_data'];
const ADMIN_RECENT_LOGOUT_KEY = 'newme_admin_recent_logout_at';
const ADMIN_RECENT_LOGOUT_TTL_MS = 1500;

let authChannel: BroadcastChannel | null = null;
let userSessionCache: unknown = null;
let adminSessionCache: unknown = null;
let userSessionActive = false;
let adminSessionActive = false;
let adminRecentLogoutAt = 0;

const getChannel = () => {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  if (!authChannel) {
    authChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    authChannel.onmessage = (event) => {
      const payload = event?.data || {};
      if (payload?.eventName === USER_SESSION_EVENT && payload?.action === 'cleared') {
        userSessionCache = null;
        userSessionActive = false;
      }
      if (payload?.eventName === USER_SESSION_EVENT && payload?.action === 'updated') {
        userSessionActive = true;
      }
      if (payload?.eventName === ADMIN_SESSION_EVENT && payload?.action === 'cleared') {
        adminSessionCache = null;
        adminSessionActive = false;
      }
      if (payload?.eventName === ADMIN_SESSION_EVENT && payload?.action === 'updated') {
        adminSessionActive = true;
      }
      window.dispatchEvent(new CustomEvent(payload?.eventName || AUTH_CHANNEL_NAME, { detail: payload }));
    };
  }
  return authChannel;
};

const emitEvent = (eventName: string, payload: Record<string, unknown>) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  }
  getChannel()?.postMessage({ eventName, ...payload });
};

const purgeLegacyLocalStorage = () => {
  if (typeof window === 'undefined') return;
  try {
    LEGACY_LOCAL_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    sessionStorage.removeItem('newme_user_session');
    sessionStorage.removeItem('newme_admin_session');
  } catch {}
};
purgeLegacyLocalStorage();
getChannel();

export const getDashboardBaseUrl = () => DASHBOARD_URL || 'http://localhost:5173';
export const hasUserSession = () => Boolean(userSessionActive);
export const hasAdminSession = () => Boolean(adminSessionActive);
export const getUserSessionEventName = () => USER_SESSION_EVENT;
export const getAdminSessionEventName = () => ADMIN_SESSION_EVENT;
export const getUserSession = <T = unknown,>() => userSessionCache as T | null;
export const getAdminSession = <T = unknown,>() => adminSessionCache as T | null;

const readRecentAdminLogoutAt = () => {
  if (typeof window === 'undefined') return adminRecentLogoutAt;
  try {
    const raw = Number(sessionStorage.getItem(ADMIN_RECENT_LOGOUT_KEY) || 0);
    if (!Number.isFinite(raw) || raw <= 0) return adminRecentLogoutAt;
    return Math.max(adminRecentLogoutAt, raw);
  } catch {
    return adminRecentLogoutAt;
  }
};

export const markRecentAdminLogout = () => {
  const now = Date.now();
  adminRecentLogoutAt = now;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(ADMIN_RECENT_LOGOUT_KEY, String(now));
    } catch {}
  }
};

export const clearRecentAdminLogout = () => {
  adminRecentLogoutAt = 0;
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(ADMIN_RECENT_LOGOUT_KEY);
    } catch {}
  }
};

export const hasRecentAdminLogout = () => {
  const recentAt = readRecentAdminLogoutAt();
  if (!recentAt) return false;
  const isRecent = Date.now() - recentAt <= ADMIN_RECENT_LOGOUT_TTL_MS;
  if (!isRecent) {
    clearRecentAdminLogout();
  }
  return isRecent;
};

export const setUserSession = (_token?: string | null, user?: unknown) => {
  purgeLegacyLocalStorage();
  userSessionActive = true;
  if (user) {
    userSessionCache = user;
  }
  emitEvent(USER_SESSION_EVENT, { type: 'user', action: 'updated' });
};

export const clearUserSession = () => {
  if (!userSessionActive && !userSessionCache) return;
  userSessionCache = null;
  userSessionActive = false;
  emitEvent(USER_SESSION_EVENT, { type: 'user', action: 'cleared' });
};

export const setAdminSession = (_token?: string | null, admin?: unknown) => {
  purgeLegacyLocalStorage();
  clearRecentAdminLogout();
  adminSessionActive = true;
  if (admin) {
    adminSessionCache = admin;
  }
  emitEvent(ADMIN_SESSION_EVENT, { type: 'admin', action: 'updated' });
};

export const clearAdminSession = () => {
  if (!adminSessionActive && !adminSessionCache) return;
  adminSessionCache = null;
  adminSessionActive = false;
  emitEvent(ADMIN_SESSION_EVENT, { type: 'admin', action: 'cleared' });
};

export const buildDashboardBridgeUrl = (_ticket = '', targetPath = '/dashboard') => {
  const url = new URL(targetPath.startsWith('/') ? targetPath : `/${targetPath}`, `${getDashboardBaseUrl()}/`);
  return url.toString();
};
