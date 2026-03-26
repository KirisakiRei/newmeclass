// @ts-nocheck
import React, { createContext, useContext, useMemo } from 'react';

const ADMIN_STORAGE_KEY = 'admin_user';

const PAGE_ACTIONS = {
  dashboard: ['view'],
  analytics: ['view', 'manage'],
  settings: ['view', 'edit', 'manage'],
  admin_management: ['view', 'create', 'edit', 'delete', 'manage'],
  cms_access: ['manage'],
  website_content: ['view', 'edit', 'manage'],
  hero_slides: ['view', 'create', 'edit', 'delete', 'manage'],
  homepage_products: ['view', 'create', 'edit', 'delete', 'manage'],
  shop_products: ['view', 'create', 'edit', 'delete', 'manage'],
  testimonials: ['view', 'create', 'edit', 'delete', 'manage'],
  activities: ['view', 'create', 'edit', 'delete', 'manage'],
  banners: ['view', 'create', 'edit', 'delete', 'manage'],
  articles: ['view', 'create', 'edit', 'delete', 'manage'],
  media: ['view', 'create', 'delete', 'manage'],
  team_management: ['view', 'create', 'edit', 'delete'],
  questions: ['view', 'create', 'edit', 'delete', 'manage'],
  personality_results: ['view', 'edit'],
  premium_results: ['view'],
  certificates: ['view', 'create', 'edit', 'manage'],
  users: ['view', 'edit', 'delete', 'manage'],
  referrals: ['view', 'edit'],
  yayasan: ['view', 'manage'],
  mitra: ['view', 'manage'],
  price_change_requests: ['view', 'manage'],
  revenue: ['view', 'manage'],
  transactions: ['view', 'manage'],
  payment_ops: ['view', 'manage'],
  yayasan_withdrawals: ['view', 'manage'],
  mitra_withdrawals: ['view', 'manage'],
};

export const ALL_ADMIN_PERMISSION_KEYS = Object.entries(PAGE_ACTIONS).flatMap(([pageKey, actions]) =>
  actions.map((actionKey) => `${pageKey}.${actionKey}`),
);

const ALL_ADMIN_PERMISSION_KEY_SET = new Set(ALL_ADMIN_PERMISSION_KEYS);

const VIEW_PERMISSION_BY_PAGE = Object.keys(PAGE_ACTIONS).reduce((acc, pageKey) => {
  if (PAGE_ACTIONS[pageKey].includes('view')) {
    acc[pageKey] = `${pageKey}.view`;
  }
  return acc;
}, {});

const CONTENT_VIEW_PERMISSIONS = [
  'cms_access.manage',
];

const TESTING_VIEW_PERMISSIONS = [
  'questions.view',
  'personality_results.view',
  'premium_results.view',
  'certificates.view',
];

const FINANCE_VIEW_PERMISSIONS = [
  'revenue.view',
  'transactions.view',
  'payment_ops.view',
  'yayasan_withdrawals.view',
  'mitra_withdrawals.view',
];

const OPERATIONAL_VIEW_PERMISSIONS = [
  'users.view',
  'referrals.view',
  'yayasan.view',
  'mitra.view',
  'price_change_requests.view',
];

const ADMIN_ROUTE_RULES = [
  { prefix: '/admin/payment-ops/help', permission: 'payment_ops.view' },
  { prefix: '/admin/personality-results/', permission: 'personality_results.edit' },
  { prefix: '/admin/personality-results', permission: 'personality_results.view' },
  { prefix: '/admin/certificates/', permission: 'certificates.view' },
  { prefix: '/admin/certificates', permission: 'certificates.view' },
  { prefix: '/admin/payment-ops', permission: 'payment_ops.view' },
  { prefix: '/admin/revenue', permission: 'revenue.view' },
  { prefix: '/admin/transactions', permission: 'transactions.view' },
  { prefix: '/admin/questions', permission: 'questions.view' },
  { prefix: '/admin/running-text', permission: 'settings.view' },
  { prefix: '/admin/banners', permission: 'banners.view' },
  { prefix: '/admin/referrals', permission: 'referrals.view' },
  { prefix: '/admin/articles', permission: 'articles.view' },
  { prefix: '/admin/team-management', permission: 'team_management.view' },
  { prefix: '/admin/analytics', permission: 'analytics.view' },
  { prefix: '/admin/settings', permission: 'settings.view' },
  { prefix: '/admin/admin-users', permission: 'admin_management.view' },
  { prefix: '/admin/website-content', permission: 'website_content.view' },
  { prefix: '/admin/hero-slides', permission: 'hero_slides.view' },
  { prefix: '/admin/homepage-products', permission: 'homepage_products.view' },
  { prefix: '/admin/shop-products', permission: 'shop_products.view' },
  { prefix: '/admin/testimonials', permission: 'testimonials.view' },
  { prefix: '/admin/activities', permission: 'activities.view' },
  { prefix: '/admin/media', permission: 'media.view' },
  { prefix: '/admin/premium-results', permission: 'premium_results.view' },
  { prefix: '/admin/yayasan', permission: 'yayasan.view' },
  { prefix: '/admin/withdrawals', permission: 'yayasan_withdrawals.view' },
  { prefix: '/admin/mitra-withdrawals', permission: 'mitra_withdrawals.view' },
  { prefix: '/admin/mitra', permission: 'mitra.view' },
  { prefix: '/admin/price-change-requests', permission: 'price_change_requests.view' },
  { prefix: '/admin/users', permission: 'users.view' },
  { prefix: '/admin/dashboard', permission: 'dashboard.view' },
];

const ADMIN_REDIRECT_ORDER = [
  '/admin/dashboard',
  '/admin/users',
  '/admin/yayasan',
  '/admin/mitra',
  '/admin/price-change-requests',
  '/admin/referrals',
  '/admin/questions',
  '/admin/personality-results',
  '/admin/premium-results',
  '/admin/certificates',
  '/admin/revenue',
  '/admin/transactions',
  '/admin/payment-ops',
  '/admin/withdrawals',
  '/admin/mitra-withdrawals',
  '/admin/analytics',
  '/admin/running-text',
  '/admin/settings',
  '/admin/admin-users',
];

const AdminAccessContext = createContext(null);

export const normalizeAdminRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase();
  return normalized || 'admin';
};

export const getStoredAdminUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredAdminUser = (adminUser) => {
  if (typeof window === 'undefined') return;
  if (!adminUser) {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    return;
  }
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(adminUser));
};

export const clearStoredAdminUser = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ADMIN_STORAGE_KEY);
};

export const getViewPermissionKey = (permissionKey) => {
  const normalized = String(permissionKey || '').trim();
  if (!normalized) return null;
  const [pageKey, actionKey] = normalized.split('.');
  if (!pageKey || !actionKey) return null;
  if (actionKey === 'view') return normalized;
  return VIEW_PERMISSION_BY_PAGE[pageKey] || null;
};

export const normalizePermissionKeys = (keys = []) => {
  const unique = Array.from(new Set((Array.isArray(keys) ? keys : []).filter((key) => ALL_ADMIN_PERMISSION_KEY_SET.has(key))));
  const keep = new Set();

  Object.entries(PAGE_ACTIONS).forEach(([pageKey, actions]) => {
    const viewKey = VIEW_PERMISSION_BY_PAGE[pageKey];
    const pagePermissions = unique.filter((key) => key.startsWith(`${pageKey}.`));
    const hasView = viewKey ? pagePermissions.includes(viewKey) : true;

    pagePermissions.forEach((key) => {
      const [, actionKey] = key.split('.');
      if (!actions.includes(actionKey)) return;
      if (hasView || actionKey === 'view' || !actions.includes('view')) {
        keep.add(key);
      }
    });
  });

  return ALL_ADMIN_PERMISSION_KEYS.filter((key) => keep.has(key));
};

export const getLegacyPermissionKeys = (role) => {
  const normalizedRole = normalizeAdminRole(role);
  if (normalizedRole === 'developer' || normalizedRole === 'superadmin') {
    return ALL_ADMIN_PERMISSION_KEYS;
  }

  if (normalizedRole === 'admin') {
    return ALL_ADMIN_PERMISSION_KEYS.filter((key) => !key.startsWith('settings.') && !key.startsWith('admin_management.'));
  }

  if (normalizedRole === 'operator') {
    return normalizePermissionKeys([
      'dashboard.view',
      'users.view',
      'referrals.view',
      'yayasan.view',
      'mitra.view',
      'price_change_requests.view',
    ]);
  }

  return [];
};

export const resolveAdminPermissionKeys = (input) => {
  if (Array.isArray(input)) {
    return normalizePermissionKeys(input);
  }

  if (input && typeof input === 'object') {
    if (Array.isArray(input.permissionKeys) && input.permissionKeys.length > 0) {
      return normalizePermissionKeys(input.permissionKeys);
    }
    return getLegacyPermissionKeys(input.role || input.adminRole?.slug || input.adminRole?.name);
  }

  if (typeof input === 'string') {
    return getLegacyPermissionKeys(input);
  }

  return [];
};

export const hasAdminPermission = (input, requiredPermission) => {
  if (!requiredPermission) return true;

  const permissionKeys = new Set(resolveAdminPermissionKeys(input));
  const requiredList = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

  return requiredList.some((permissionKey) => {
    if (!permissionKey) return true;
    const viewKey = getViewPermissionKey(permissionKey);
    if (viewKey && !permissionKeys.has(viewKey)) {
      return false;
    }
    return permissionKeys.has(permissionKey);
  });
};

export const hasAnyAdminPermission = (input, permissions = []) =>
  (Array.isArray(permissions) ? permissions : [permissions]).some((permission) => hasAdminPermission(input, permission));

export const canManageAdminUsers = (input) => hasAdminPermission(input, 'admin_management.manage');
export const canViewSettings = (input) => hasAdminPermission(input, 'settings.view');
export const canViewFinance = (input) => hasAnyAdminPermission(input, FINANCE_VIEW_PERMISSIONS);
export const canViewPaymentMonitoring = (input) => hasAdminPermission(input, 'payment_ops.view');
export const canViewCms = (input) => hasAnyAdminPermission(input, CONTENT_VIEW_PERMISSIONS);
export const canViewTesting = (input) => hasAnyAdminPermission(input, TESTING_VIEW_PERMISSIONS);
export const canViewAnalytics = (input) => hasAdminPermission(input, 'analytics.view');
export const canViewOperationalData = (input) => hasAnyAdminPermission(input, OPERATIONAL_VIEW_PERMISSIONS);

export const getRequiredPermissionForAdminPath = (path = '') => {
  const pathname = String(path || '').trim();
  if (!pathname.startsWith('/admin')) return null;
  const matchedRule = ADMIN_ROUTE_RULES.find((rule) => pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`));
  return matchedRule?.permission || null;
};

export const canAccessAdminPath = (input, path = '') => {
  const requiredPermission = getRequiredPermissionForAdminPath(path);
  if (!requiredPermission) return true;
  return hasAdminPermission(input, requiredPermission);
};

export const getFirstAllowedAdminPath = (input) =>
  ADMIN_REDIRECT_ORDER.find((path) => canAccessAdminPath(input, path)) || null;

export const getAdminRoleLabel = (input) => {
  const adminUser = input && typeof input === 'object' ? input : getStoredAdminUser();
  if (adminUser?.adminRole?.name) return adminUser.adminRole.name;

  const role = normalizeAdminRole(adminUser?.role || input);
  if (role === 'developer') return 'Developer';
  if (role === 'superadmin') return 'Super Admin';
  if (role === 'operator') return 'Operator';
  return 'Admin';
};

export const isProtectedAdminRole = (input) => Boolean(
  input?.isProtectedAdminRole
  || input?.adminRole?.isProtected
  || input?.adminRole?.slug === 'developer-root'
  || input?.adminRole?.slug === 'protected-full-access',
);

export const togglePermissionKeySelection = (currentKeys, permissionKey, enabled) => {
  const next = new Set(resolveAdminPermissionKeys(currentKeys));
  const normalizedKey = String(permissionKey || '').trim();
  if (!ALL_ADMIN_PERMISSION_KEY_SET.has(normalizedKey)) {
    return Array.from(next);
  }

  const [pageKey, actionKey] = normalizedKey.split('.');
  const viewKey = VIEW_PERMISSION_BY_PAGE[pageKey];

  if (actionKey === 'view') {
    if (enabled) {
      next.add(normalizedKey);
    } else {
      Array.from(next).forEach((key) => {
        if (key.startsWith(`${pageKey}.`)) {
          next.delete(key);
        }
      });
    }
    return normalizePermissionKeys(Array.from(next));
  }

  if (enabled) {
    if (viewKey) next.add(viewKey);
    next.add(normalizedKey);
  } else {
    next.delete(normalizedKey);
  }

  return normalizePermissionKeys(Array.from(next));
};

export const isPermissionActionLocked = (currentKeys, permissionKey) => {
  const normalizedKey = String(permissionKey || '').trim();
  const [pageKey, actionKey] = normalizedKey.split('.');
  if (!pageKey || actionKey === 'view') return false;
  const viewKey = VIEW_PERMISSION_BY_PAGE[pageKey];
  if (!viewKey) return false;
  return !resolveAdminPermissionKeys(currentKeys).includes(viewKey);
};

const buildAccessSnapshot = (adminUser, setAdminUser) => {
  const permissionKeys = resolveAdminPermissionKeys(adminUser);
  return {
    adminUser,
    permissionKeys,
    roleLabel: getAdminRoleLabel(adminUser),
    isProtectedRole: isProtectedAdminRole(adminUser),
    setAdminUser,
    hasPermission: (requiredPermission) => hasAdminPermission(permissionKeys, requiredPermission),
    canAccessPath: (path) => canAccessAdminPath(permissionKeys, path),
    firstAllowedPath: getFirstAllowedAdminPath(permissionKeys),
  };
};

export const AdminAccessProvider = ({ adminUser, setAdminUser, children }) => {
  const value = useMemo(() => buildAccessSnapshot(adminUser, setAdminUser), [adminUser, setAdminUser]);
  return (
    <AdminAccessContext.Provider value={value}>
      {children}
    </AdminAccessContext.Provider>
  );
};

export const useAdminAccess = () => {
  const context = useContext(AdminAccessContext);
  if (context) return context;
  return buildAccessSnapshot(getStoredAdminUser(), () => {});
};

export const useAdminPermission = (requiredPermission) => {
  const access = useAdminAccess();
  return access.hasPermission(requiredPermission);
};
