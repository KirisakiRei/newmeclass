import { request } from './client';

export const authAPI = {
  register: (data: Record<string, unknown>) =>
    request('/auth/register', {
      method: 'POST',
      body: data,
    }),
  login: (data: Record<string, unknown>) =>
    request('/auth/login', {
      method: 'POST',
      body: data,
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
  createBridgeTicket: (target = '/dashboard') =>
    request('/auth/bridge-ticket', {
      method: 'POST',
      body: { target },
      tokenKey: 'user_token',
    }),
  getProfile: () => request('/auth/me', { tokenKey: 'user_token' }),
};

export const adminAuthAPI = {
  login: (data: Record<string, unknown>) =>
    request('/admin/login', {
      method: 'POST',
      body: data,
    }),
  getProfile: () => request('/admin/me', { tokenKey: 'admin_token' }),
};
