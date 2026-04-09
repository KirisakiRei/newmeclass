import { API_URL, request } from './client';

export const authAPI = {
  /** @deprecated Use registerStart -> verifyRegisterOtp -> completeRegister for new flows. */
  register: (data: Record<string, unknown>) =>
    request('/auth/register', {
      method: 'POST',
      body: data,
    }),
  registerStart: (data: Record<string, unknown>) =>
    request('/auth/register/start', {
      method: 'POST',
      body: data,
    }),
  verifyRegisterOtp: (data: Record<string, unknown>) =>
    request('/auth/register/verify-otp', {
      method: 'POST',
      body: data,
    }),
  resendRegisterOtp: (data: Record<string, unknown>) =>
    request('/auth/register/resend-otp', {
      method: 'POST',
      body: data,
    }),
  completeRegister: (data: Record<string, unknown>) =>
    request('/auth/register/complete', {
      method: 'POST',
      body: data,
    }),
  login: (data: Record<string, unknown>) =>
    request('/auth/login', {
      method: 'POST',
      body: data,
    }),
  getSession: () => request('/auth/session', { tokenKey: 'user_token' }),
  refresh: () =>
    request('/auth/refresh', {
      method: 'POST',
    }),
  logout: () =>
    request('/auth/logout', {
      method: 'POST',
    }),
  forgotPassword: (email: string) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),
  resetPassword: (token: string, password: string) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    }),
  getProfile: () => request('/auth/me', { tokenKey: 'user_token' }),
  completeGoogleProfile: (data: Record<string, unknown>) =>
    request('/auth/google/complete-profile', {
      method: 'POST',
      body: data,
    }),
  buildGoogleStartUrl: (options: { intent?: 'login' | 'register'; target?: string; ref?: string } = {}) => {
    const url = new URL(`${API_URL}/auth/google/start`);
    if (options.intent) url.searchParams.set('intent', options.intent);
    if (options.target) url.searchParams.set('target', options.target);
    if (options.ref) url.searchParams.set('ref', options.ref);
    return url.toString();
  },
};

export const adminAuthAPI = {
  login: (data: Record<string, unknown>) =>
    request('/admin/login', {
      method: 'POST',
      body: data,
    }),
  refresh: () =>
    request('/admin/refresh', {
      method: 'POST',
    }),
  logout: () =>
    request('/admin/logout', {
      method: 'POST',
    }),
  getSession: () => request('/admin/session', { tokenKey: 'admin_token' }),
  getProfile: () => request('/admin/me', { tokenKey: 'admin_token' }),
};
