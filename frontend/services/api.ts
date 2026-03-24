// @ts-nocheck
import axios from 'axios';
import { setupInstanceAxiosNormalizer } from './http-normalizer';
import { normalizeSiteSettings } from '../lib/site-settings';

const API_BASE_URL = String(process.env.REACT_APP_BACKEND_URL || '').trim().replace(/\/+$/, '');
const API_URL = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';
const getStoredToken = (...keys) => keys.map((key) => localStorage.getItem(key)).find(Boolean);
const TOKEN_REFRESH_THRESHOLD_MS = 2 * 60 * 1000;
const SESSION_META_PREFIX = 'session_meta_';
const SESSION_ACTIVITY_PREFIX = 'session_last_activity_';
const TOKEN_KEY_CONFIG = {
  admin_token: {
    idleTimeoutMs: 10 * 60 * 1000,
    warningThresholdMs: 2 * 60 * 1000,
    redirectTo: '/admin/login',
    dataKeys: ['admin_token'],
  },
  mitra_token: {
    idleTimeoutMs: 10 * 60 * 1000,
    warningThresholdMs: 2 * 60 * 1000,
    redirectTo: '/mitra/login',
    dataKeys: ['mitra_token', 'mitra_data'],
  },
  yayasan_token: {
    idleTimeoutMs: 10 * 60 * 1000,
    warningThresholdMs: 2 * 60 * 1000,
    redirectTo: '/yayasan/login',
    dataKeys: ['yayasan_token', 'yayasan_data'],
  },
  user_token: {
    idleTimeoutMs: 20 * 60 * 1000,
    warningThresholdMs: 3 * 60 * 1000,
    redirectTo: '/login',
    dataKeys: ['user_token', 'user_data'],
  },
};
const isAdminEndpoint = (url = '') => (
  url.startsWith('/admin/')
  || url.startsWith('/users')
  || url.startsWith('/payments')
  || url.startsWith('/products')
  || url.startsWith('/media')
  || url.startsWith('/website-content')
  || url.startsWith('/questions')
  || url.startsWith('/personality-results')
  || url.startsWith('/banners')
  || url.startsWith('/transactions')
  || url.startsWith('/analytics')
  || url.startsWith('/articles')
  || url.startsWith('/running-info')
  || url.startsWith('/finance')
  || url.startsWith('/settings')
  || url.startsWith('/yayasan/admin')
  || url.startsWith('/mitra/admin')
  || url.startsWith('/test-results/admin')
);
const isYayasanEndpoint = (url = '') => url.startsWith('/yayasan') && !url.startsWith('/yayasan/admin');
const isMitraEndpoint = (url = '') => url.startsWith('/mitra') && !url.startsWith('/mitra/admin');
const isUserEndpoint = (url = '') => (
  url.startsWith('/auth/')
  || url.startsWith('/user-payments/')
  || url.startsWith('/wallet/')
  || url.startsWith('/test-access/')
  || url.startsWith('/test-results/')
  || url.startsWith('/personality-tests/')
  || url.startsWith('/ai-analysis/')
  || url.startsWith('/referrals/')
  || url.startsWith('/certificates/')
);
const isCertificateUserEndpoint = (url = '') => (
  url.startsWith('/certificates/generate-newme/')
  || url.startsWith('/certificates/preview-data/')
  || url.startsWith('/certificates/download-ai-certificate')
  || url.startsWith('/certificates/check-eligibility')
);
const isCertificatePublicEndpoint = (url = '') => url.startsWith('/certificates/verify/');
const isReferralAdminEndpoint = (url = '', method = 'get') => (
  url.startsWith('/referrals/')
  && !(url === '/referrals/settings' && String(method).toLowerCase() === 'get')
);
const isCertificateAdminEndpoint = (url = '') => (
  url.startsWith('/certificates/')
  && !isCertificateUserEndpoint(url)
  && !isCertificatePublicEndpoint(url)
);

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
setupInstanceAxiosNormalizer(apiClient);

const refreshPromiseByTokenKey = new Map();

const getRefreshPromiseKey = (tokenKey, token) => `${String(tokenKey || '')}:${String(token || '')}`;

const persistSessionMeta = (tokenKey, session) => {
  if (!tokenKey || !session) return;
  try {
    localStorage.setItem(`${SESSION_META_PREFIX}${tokenKey}`, JSON.stringify(session));
  } catch {}
};

export const getSessionPolicy = (tokenKey) => TOKEN_KEY_CONFIG[tokenKey] || null;

export const getSessionMeta = (tokenKey) => {
  if (!tokenKey) return null;
  try {
    const raw = localStorage.getItem(`${SESSION_META_PREFIX}${tokenKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const recordSessionActivity = (tokenKey, ts = Date.now()) => {
  if (!tokenKey) return;
  try {
    sessionStorage.setItem(`${SESSION_ACTIVITY_PREFIX}${tokenKey}`, String(ts));
  } catch {}
};

export const getLastSessionActivity = (tokenKey) => {
  if (!tokenKey) return Date.now();
  try {
    const raw = sessionStorage.getItem(`${SESSION_ACTIVITY_PREFIX}${tokenKey}`);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
  } catch {
    return Date.now();
  }
};

export const clearAuthStorage = (tokenKey) => {
  const config = TOKEN_KEY_CONFIG[tokenKey];
  if (config) {
    config.dataKeys.forEach((key) => localStorage.removeItem(key));
  } else if (tokenKey) {
    localStorage.removeItem(tokenKey);
  }
  localStorage.removeItem(`${SESSION_META_PREFIX}${tokenKey}`);
  sessionStorage.removeItem(`${SESSION_ACTIVITY_PREFIX}${tokenKey}`);
};

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
};

const isTokenNearExpiry = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false;
  const expiresAt = Number(payload.exp) * 1000;
  if (!Number.isFinite(expiresAt)) return false;
  return (expiresAt - Date.now()) <= TOKEN_REFRESH_THRESHOLD_MS;
};

const resolveTokenConfig = (url = '', method = 'get') => {
  if (isAdminEndpoint(url) || isCertificateAdminEndpoint(url) || isReferralAdminEndpoint(url, method)) {
    return { tokenKey: 'admin_token', token: getStoredToken('admin_token') };
  }
  if (isYayasanEndpoint(url)) {
    return { tokenKey: 'yayasan_token', token: getStoredToken('yayasan_token') };
  }
  if (isMitraEndpoint(url)) {
    return { tokenKey: 'mitra_token', token: getStoredToken('mitra_token') };
  }
  if (isCertificateUserEndpoint(url)) {
    const tokenKey = localStorage.getItem('user_token') ? 'user_token' : 'yayasan_token';
    return { tokenKey, token: getStoredToken('user_token', 'yayasan_token') };
  }
  if (url.startsWith('/auth/')) {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin') && localStorage.getItem('admin_token')) {
      return { tokenKey: 'admin_token', token: getStoredToken('admin_token') };
    }
    if (localStorage.getItem('user_token')) return { tokenKey: 'user_token', token: getStoredToken('user_token') };
    if (localStorage.getItem('yayasan_token')) return { tokenKey: 'yayasan_token', token: getStoredToken('yayasan_token') };
    if (localStorage.getItem('mitra_token')) return { tokenKey: 'mitra_token', token: getStoredToken('mitra_token') };
    if (localStorage.getItem('admin_token')) return { tokenKey: 'admin_token', token: getStoredToken('admin_token') };
    return { tokenKey: null, token: null };
  }
  if (isUserEndpoint(url)) {
    return { tokenKey: 'user_token', token: getStoredToken('user_token') };
  }
  return { tokenKey: null, token: getStoredToken('admin_token', 'user_token', 'yayasan_token', 'mitra_token') };
};

const refreshSessionToken = async (tokenKey, token, options = {}) => {
  const { swallowError = true } = options;
  if (!tokenKey || !token) return token;

  const refreshKey = getRefreshPromiseKey(tokenKey, token);
  const existing = refreshPromiseByTokenKey.get(refreshKey);
  if (existing) {
    return existing;
  }

  const promise = axios.post(`${API_URL}/auth/refresh-session`, {}, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }).then((response) => {
    const refreshedToken = response?.data?.token || response?.data?.access_token || token;
    const currentStoredToken = localStorage.getItem(tokenKey);
    if (refreshedToken && currentStoredToken === token) {
      localStorage.setItem(tokenKey, refreshedToken);
      if (response?.data?.session) {
        persistSessionMeta(tokenKey, response.data.session);
      }
      recordSessionActivity(tokenKey);
    }
    return refreshedToken;
  }).catch((error) => {
    if (swallowError) return token;
    throw error;
  }).finally(() => {
    refreshPromiseByTokenKey.delete(refreshKey);
  });

  refreshPromiseByTokenKey.set(refreshKey, promise);
  return promise;
};

// Add request interceptor for auth token
apiClient.interceptors.request.use(
  async (config) => {
    const url = config.url || '';
    const method = config.method || 'get';
    const tokenConfig = resolveTokenConfig(url, method);
    let token = tokenConfig.token;

    if (token && url !== '/auth/refresh-session' && isTokenNearExpiry(token)) {
      token = await refreshSessionToken(tokenConfig.tokenKey, token);
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Registration API
export const registrationAPI = {
  create: (data) => apiClient.post('/registrations', data),
  getAll: (params) => apiClient.get('/registrations', { params }),
  getById: (id) => apiClient.get(`/registrations/${id}`),
  getStats: () => apiClient.get('/registrations/stats/summary'),
};

// Contact API
export const contactAPI = {
  create: (data) => apiClient.post('/contacts', data),
  getAll: (params) => apiClient.get('/contacts', { params }),
  getById: (id) => apiClient.get(`/contacts/${id}`),
  updateStatus: (id, status, notes) =>
    apiClient.request({
      method: 'put',
      url: `/contacts/${id}/status`,
      params: { status, ...(notes ? { notes } : {}) },
    }),
  getStats: () => apiClient.get('/contacts/stats/summary'),
};

// Institution API
export const institutionAPI = {
  createInquiry: (data) => apiClient.post('/institutions/inquiry', data),
  getAll: (params) => apiClient.get('/institutions', { params }),
  getById: (id) => apiClient.get(`/institutions/${id}`),
  updateStatus: (id, status) =>
    apiClient.request({
      method: 'put',
      url: `/institutions/${id}/status`,
      params: { status },
    }),
  getStats: () => apiClient.get('/institutions/stats/summary'),
};

// Admin API
export const adminAPI = {
  login: (data) => apiClient.post('/admin/login', data),
  getDashboardStats: () => apiClient.get('/admin/dashboard/stats'),
  getCurrentAdmin: () => apiClient.get('/admin/me'),
  getPermissionCatalog: () => apiClient.get('/admin/permissions'),
  getAdminRoles: () => apiClient.get('/admin/roles'),
  createAdminRole: (data) => apiClient.post('/admin/roles', data),
  updateAdminRole: (roleId, data) => apiClient.put(`/admin/roles/${roleId}`, data),
  deleteAdminRole: (roleId) => apiClient.delete(`/admin/roles/${roleId}`),
  getAdminUsers: (params) => apiClient.get('/admin/users', { params }),
  createAdminUser: (data) => apiClient.post('/admin/users', data),
  updateAdminUser: (adminId, data) => apiClient.put(`/admin/users/${adminId}`, data),
  changeAdminPassword: (adminId, data) => apiClient.put(`/admin/users/${adminId}/change-password`, data),
  deleteAdminUser: (adminId) => apiClient.delete(`/admin/users/${adminId}`),
};

// Users API
export const usersAPI = {
  getAll: (params) => apiClient.get('/users', { params }),
  getById: (id) => apiClient.get(`/users/${id}`),
  update: (id, data) => apiClient.put(`/users/${id}`, data),
  delete: (id) => apiClient.delete(`/users/${id}`),
  updateStatus: (id, status) => apiClient.request({
    method: 'put',
    url: `/users/${id}/status`,
    params: { status },
  }),
  getStats: () => apiClient.get('/users/stats/summary'),
};

// Payment API
export const paymentAPI = {
  uploadProof: (formData) => apiClient.post('/payments/upload-proof', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: (params) => apiClient.get('/payments', { params }),
  approve: (id, data) => apiClient.put(`/payments/${id}/approve`, data),
  getByRegistration: (registrationId) => apiClient.get(`/payments/registration/${registrationId}`),
  getStats: () => apiClient.get('/payments/stats/summary'),
  getOpsSummary: () => apiClient.get('/payments/ops/summary'),
  getOpsWebhooks: (params) => apiClient.get('/payments/ops/webhooks', { params }),
  getOpsAlerts: (params) => apiClient.get('/payments/ops/alerts', { params }),
  acknowledgeOpsAlert: (id) => apiClient.post(`/payments/ops/alerts/${id}/acknowledge`),
  replayWebhook: (id) => apiClient.post(`/payments/ops/webhooks/${id}/replay`),
};

// Products API
export const productsAPI = {
  getAll: (params) => apiClient.get('/products', { params }),
  getById: (id) => apiClient.get(`/products/${id}`),
  create: (data) => apiClient.post('/products', data),
  update: (id, data) => apiClient.put(`/products/${id}`, data),
  delete: (id) => apiClient.delete(`/products/${id}`),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/products/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getCategories: () => apiClient.get('/products/categories/list'),
  getStats: () => apiClient.get('/products/stats/summary'),
};

// Media Gallery API
export const mediaAPI = {
  getAll: (params) => apiClient.get('/media', { params }),
  create: (data) => apiClient.post('/media', data),
  syncContentAssets: () => apiClient.post('/media/sync-content-assets'),
  delete: (id) => apiClient.delete(`/media/${id}`),
};

// Website Content API
export const websiteContentAPI = {
  getHeroSlides: () => apiClient.get('/website-content/hero-slides'),
  createHeroSlide: (data) => apiClient.post('/website-content/hero-slides', data),
  updateHeroSlide: (id, data) => apiClient.put(`/website-content/hero-slides/${id}`, data),
  deleteHeroSlide: (id) => apiClient.delete(`/website-content/hero-slides/${id}`),
  getProducts: () => apiClient.get('/website-content/products'),
  createProduct: (data) => apiClient.post('/website-content/products', data),
  updateProduct: (id, data) => apiClient.put(`/website-content/products/${id}`, data),
  deleteProduct: (id) => apiClient.delete(`/website-content/products/${id}`),
  getTestimonials: () => apiClient.get('/website-content/testimonials'),
  createTestimonial: (data) => apiClient.post('/website-content/testimonials', data),
  updateTestimonial: (id, data) => apiClient.put(`/website-content/testimonials/${id}`, data),
  deleteTestimonial: (id) => apiClient.delete(`/website-content/testimonials/${id}`),
  getActivities: () => apiClient.get('/website-content/activities'),
  createActivity: (data) => apiClient.post('/website-content/activities', data),
  updateActivity: (id, data) => apiClient.put(`/website-content/activities/${id}`, data),
  deleteActivity: (id) => apiClient.delete(`/website-content/activities/${id}`),
  getSections: () => apiClient.get('/website-content/sections'),
  reorderSections: (sections) => apiClient.put('/website-content/sections/reorder', { sections }),
  updateSection: (id, data) => apiClient.put(`/website-content/sections/${id}`, data),
  seedDefaults: () => apiClient.post('/website-content/seed-defaults'),
};

// Questions API
export const questionsAPI = {
  getAll: (params) => apiClient.get('/questions', { params }),
  getPublic: (params) => apiClient.get('/questions/public', { params }),
  getById: (id) => apiClient.get(`/questions/${id}`),
  seed: () => apiClient.post('/questions/seed-questions'),
  create: (data) => apiClient.post('/questions', data),
  update: (id, data) => apiClient.put(`/questions/${id}`, data),
  delete: (id) => apiClient.delete(`/questions/${id}`),
  getCategories: () => apiClient.get('/questions/categories/list'),
  reorder: (orders) => apiClient.put('/questions/reorder', orders),
};

// Personality Results API
export const personalityResultsAPI = {
  getAll: () => apiClient.get('/personality-results'),
  getByCode: (code) => apiClient.get(`/personality-results/${code}`),
  update: (code, data) => apiClient.put(`/personality-results/${code}`, data),
};

// Banners API
export const bannersAPI = {
  getAll: (params) => apiClient.get('/banners', { params }),
  getById: (id) => apiClient.get(`/banners/${id}`),
  create: (formData) => apiClient.post('/banners', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => apiClient.put(`/banners/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => apiClient.delete(`/banners/${id}`),
  reorder: (orders) => apiClient.put('/banners/reorder', orders),
};

// Transactions API
export const transactionsAPI = {
  create: (data) => apiClient.post('/transactions/create', data),
  getStatus: (orderId) => apiClient.get(`/transactions/${orderId}/status`),
  getAll: (params) => apiClient.get('/transactions', { params }),
  getStats: () => apiClient.get('/transactions/stats/summary'),
};

export const financeAPI = {
  getRevenue: (params) => apiClient.get('/finance/revenue', { params }),
  getTransactions: (params) => apiClient.get('/finance/transactions', { params }),
  getDisbursements: (params) => apiClient.get('/finance/disbursements', { params }),
  processDisbursement: (id, data) => apiClient.put(`/finance/disbursements/${id}/process`, data),
  createDeveloperDisbursement: (data) => apiClient.post('/finance/disbursements/developer', data),
};

// Certificates API
export const certificatesAPI = {
  getTemplate: (certType) => apiClient.get('/certificates/template', { params: { certType } }),
  getById: (id) => apiClient.get(`/certificates/detail/${id}`),
  updateTemplate: (data) => apiClient.put('/certificates/template', data),
  uploadAsset: (assetType, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/certificates/template/upload/${assetType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  getIssued: (params) => apiClient.get('/certificates/issued', { params }),
  issue: (data) => apiClient.post('/certificates/issue', data),
  verify: (certificateNumber) => apiClient.get(`/certificates/verify/${certificateNumber}`),
  checkEligibility: () => apiClient.get('/certificates/check-eligibility'),
  getPreviewData: (userId) => apiClient.get(`/certificates/preview-data/${userId}`),
  downloadAICertificate: () => apiClient.get('/certificates/download-ai-certificate', { responseType: 'arraybuffer' }),
  generateMyCertificate: (userId) => apiClient.get(`/certificates/generate-newme/${userId}`, { responseType: 'arraybuffer' }),
  generateYayasanUserCertificate: (userId) => apiClient.get(`/certificates/generate-newme/${userId}`, { responseType: 'arraybuffer' }),
};

// Analytics API
export const analyticsAPI = {
  trackPageview: (page, sessionId) => apiClient.request({
    method: 'post',
    url: '/analytics/pageview',
    params: { page, ...(sessionId ? { sessionId } : {}) },
  }),
  getStats: () => apiClient.get('/analytics/stats'),
  getOnlineUsers: () => apiClient.get('/analytics/online-users'),
  cleanup: () => apiClient.delete('/analytics/cleanup'),
};

// Settings API
export const settingsAPI = {
  get: async () => {
    const response = await apiClient.get('/settings');
    return {
      ...response,
      data: normalizeSiteSettings(response.data),
    };
  },
  getTeamManagement: () => apiClient.get('/settings/team-management'),
  updateTeamManagementSection: (sectionKey, items) => apiClient.put(`/settings/team-management/${sectionKey}`, { items }),
  getTestPrice: () => apiClient.get('/settings/test-price'),
  getSystemSummary: () => apiClient.get('/settings/system-summary'),
  update: (data) => apiClient.put('/settings', data),
  uploadAsset: (assetType, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post(`/settings/upload/${assetType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteBanner: (index) => apiClient.delete(`/settings/banner/${index}`),
  getJenjangConfig: () => apiClient.get('/settings/jenjang-config'),
  updateJenjangConfig: (data) => apiClient.put('/settings/jenjang-config', data),
};

// User Auth API
export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  getProfile: () => apiClient.get('/auth/me'),
  refreshSession: () => apiClient.post('/auth/refresh-session'),
  createBridgeTicket: (target) => apiClient.post('/auth/bridge-ticket', { target }),
  exchangeBridgeTicket: (ticket) => apiClient.post('/auth/bridge-exchange', { ticket }),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  changePassword: (data) => apiClient.put('/auth/change-password', data),
  getReferralLink: () => apiClient.get('/auth/referral-link'),
};

export const touchSessionForTokenKey = async (tokenKey) => {
  const token = tokenKey ? localStorage.getItem(tokenKey) : null;
  if (!tokenKey || !token) return null;
  const refreshedToken = await refreshSessionToken(tokenKey, token, { swallowError: false });
  return refreshedToken;
};

// User Payments API
export const userPaymentsAPI = {
  uploadProof: (formData) => apiClient.post('/user-payments/upload-proof', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getMyPayments: () => apiClient.get('/user-payments/my-payments'),
  getTestPrice: (referralCode) => apiClient.get('/user-payments/test-price', {
    params: referralCode ? { referralCode } : {},
  }),
  createQRIS: () => apiClient.post('/user-payments/create-qris'),
  createSnap: (data) => apiClient.post('/user-payments/create-snap', data || {}),
  cancelPayment: (orderId) => apiClient.post(`/user-payments/cancel-payment/${orderId}`),
  checkQRIS: (uniqueCode) => apiClient.get(`/user-payments/check-qris/${uniqueCode}`),
  checkPayment: (orderId) => apiClient.get(`/user-payments/check-payment/${orderId}`),
  getStatus: (userId) => apiClient.get(`/user-payments/status/${userId}`),
};

// Referral API
export const referralAPI = {
  getSettings: () => apiClient.get('/referrals/settings'),
  updateSettings: (formData) => apiClient.put('/referrals/settings', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getLeaderboard: (limit) => apiClient.get('/referrals/leaderboard', {
    params: { limit: limit || 20 },
  }),
  getTransactions: (params) => apiClient.get('/referrals/transactions', { params }),
  getStats: () => apiClient.get('/referrals/stats'),
};

// Articles API
export const articlesAPI = {
  getAll: (params) => apiClient.get('/articles', { params }),
  getById: (id) => apiClient.get(`/articles/${id}`),
  create: (formData) => apiClient.post('/articles', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => apiClient.put(`/articles/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => apiClient.delete(`/articles/${id}`),
  getStats: () => apiClient.get('/articles/stats/summary'),
};

// Running Info API
export const runningInfoAPI = {
  getActive: () => apiClient.get('/running-info', { params: { isActive: true } }),
  getAll: () => apiClient.get('/running-info/all'),
  create: (formData) => apiClient.post('/running-info', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => apiClient.put(`/running-info/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => apiClient.delete(`/running-info/${id}`),
};

// Personality Tests API
export const personalityTestsAPI = {
  getQuestions: (testType, includePremium) => apiClient.get(`/personality-tests/questions/${testType}`, {
    params: { include_premium: includePremium },
  }),
  submitTest: (data) => apiClient.post('/personality-tests/submit', data),
  getCorePremiumQuestions: () => apiClient.get('/personality-tests/core-premium/questions'),
  submitCorePremium: (data) => apiClient.post('/personality-tests/core-premium/submit', data),
  getDescription: (personalityType) => apiClient.get(`/personality-tests/descriptions/${personalityType}`),
  getMyResults: () => apiClient.get('/personality-tests/my-results'),
  getStats: () => apiClient.get('/personality-tests/stats'),
};

// Personal Analysis API
const personalAnalysisClient = {
  analyze: (data) => apiClient.post('/ai-analysis/analyze', data),
  getMyAnalyses: () => apiClient.get('/ai-analysis/my-analyses'),
  getLatest: () => apiClient.get('/ai-analysis/latest'),
};

export const personalAnalysisAPI = personalAnalysisClient;
export const aiAnalysisAPI = personalAnalysisClient;

export const testAccessAPI = {
  check: () => apiClient.get('/test-access/check'),
  recordFreeTest: (category) => apiClient.request({
    method: 'post',
    url: '/test-access/record-free-test',
    params: { category },
  }),
};

export const testResultsAPI = {
  submit: (data) => apiClient.post('/test-results', data),
  getById: (id) => apiClient.get(`/test-results/${id}`),
  checkFreeTest: (userId) => apiClient.get(`/test-results/check-free-test/${userId}`),
  getAdminPremium: (params) => apiClient.get('/test-results/admin/premium-results', { params }),
  getAdminPremiumByUser: (userId) => apiClient.get(`/test-results/admin/premium-results/${userId}`),
  getAdminStats: () => apiClient.get('/test-results/admin/stats'),
};

export const walletAPI = {
  getBalance: (userId) => apiClient.get(`/wallet/balance/${userId}`),
  getTransactions: (userId, params) => apiClient.get(`/wallet/transactions/${userId}`, { params }),
  topup: (data) => apiClient.post('/wallet/topup', data),
  checkStatus: (orderId) => apiClient.get(`/wallet/check-status/${orderId}`),
  payTest: (data) => apiClient.post('/wallet/pay-test', data),
};

export const yayasanAPI = {
  register: (data) => apiClient.post('/yayasan/register', data),
  login: (data) => apiClient.post('/yayasan/login', data),
  getMitraReferralStatus: (code) => apiClient.get(`/mitra/referral/${encodeURIComponent(code)}/status`),
  getProfile: () => apiClient.get('/yayasan/me'),
  getDashboardStats: () => apiClient.get('/yayasan/dashboard/stats'),
  getUsers: (params) => apiClient.get('/yayasan/users', { params }),
  getUserDetail: (id) => apiClient.get(`/yayasan/users/${id}/detail`),
  getTestResults: (params) => apiClient.get('/yayasan/test-results', { params }),
  getWallet: (params) => apiClient.get('/yayasan/wallet', { params }),
  withdraw: (data) => apiClient.post('/yayasan/wallet/withdraw', data),
  getAdminList: (params) => apiClient.get('/yayasan/admin/list', { params }),
  getAdminDetail: (id) => apiClient.get(`/yayasan/admin/${id}/detail`),
  toggleActive: (id) => apiClient.put(`/yayasan/admin/${id}/toggle-active`, {}),
  verify: (id) => apiClient.put(`/yayasan/admin/${id}/verify`, {}),
  getWithdrawals: (params) => apiClient.get('/yayasan/admin/withdrawals', { params }),
  approveWithdrawal: (id, data) => apiClient.put(`/yayasan/admin/withdrawals/${id}/approve`, data),
  rejectWithdrawal: (id, data) => apiClient.put(`/yayasan/admin/withdrawals/${id}/reject`, data),
};

export const mitraAPI = {
  register: (data) => apiClient.post('/mitra/register', data),
  login: (data) => apiClient.post('/mitra/login', data),
  validateInvite: (token) => apiClient.get('/mitra/invite/validate', { params: { token } }),
  claimInvite: (data) => apiClient.post('/mitra/invite/claim', data),
  getProfile: () => apiClient.get('/mitra/me'),
  getDashboardStats: () => apiClient.get('/mitra/dashboard/stats'),
  getYayasan: (params) => apiClient.get('/mitra/yayasan', { params }),
  getYayasanDetail: (id) => apiClient.get(`/mitra/yayasan/${id}/detail`),
  getWallet: (params) => apiClient.get('/mitra/wallet', { params }),
  approveYayasan: (id, data) => apiClient.post(`/mitra/yayasan/${id}/approve`, data),
  setYayasanPrice: (id, data) => apiClient.put(`/mitra/yayasan/${id}/price`, data),
  createPriceChangeRequest: (id, data) => apiClient.post(`/mitra/yayasan/${id}/price-change-requests`, data),
  getPriceChangeRequests: (params) => apiClient.get('/mitra/price-change-requests', { params }),
  withdraw: (data) => apiClient.post('/mitra/withdraw', data),
  createAdminInvite: (data) => apiClient.post('/mitra/admin', data),
  getAdminList: (params) => apiClient.get('/mitra/admin/list', { params }),
  getAdminDetail: (id) => apiClient.get(`/mitra/admin/${id}/detail`),
  resendInvite: (id) => apiClient.post(`/mitra/admin/${id}/invite/resend`),
  revokeInvite: (id) => apiClient.post(`/mitra/admin/${id}/invite/revoke`),
  updateCapacity: (id, data) => apiClient.put(`/mitra/admin/${id}/capacity`, data),
  getCapacityHistory: (id) => apiClient.get(`/mitra/admin/${id}/capacity-history`),
  getAdminPriceChangeRequests: (params) => apiClient.get('/mitra/admin/price-change-requests', { params }),
  reviewAdminPriceChangeRequest: (id, data) => apiClient.put(`/mitra/admin/price-change-requests/${id}/review`, data),
  toggleActive: (id) => apiClient.put(`/mitra/admin/${id}/toggle-active`, {}),
  verify: (id) => apiClient.put(`/mitra/admin/${id}/verify`, {}),
  resetPassword: (id) => apiClient.post(`/mitra/admin/${id}/reset-password`),
  getWithdrawals: (params) => apiClient.get('/mitra/admin/withdrawals', { params }),
  approveWithdrawal: (id, data) => apiClient.put(`/mitra/admin/withdrawals/${id}/approve`, data),
  rejectWithdrawal: (id, data) => apiClient.put(`/mitra/admin/withdrawals/${id}/reject`, data),
};

// Health check
export const healthCheck = () => apiClient.get('/health');

export default apiClient;
