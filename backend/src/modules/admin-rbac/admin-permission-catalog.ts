import { Role } from '@prisma/client';

export type AdminPermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'manage';

export type AdminPermissionDefinition = {
  key: string;
  groupKey: string;
  groupLabel: string;
  groupOrder: number;
  pageKey: string;
  pageLabel: string;
  pageOrder: number;
  actionKey: AdminPermissionAction;
  actionLabel: string;
  actionOrder: number;
};

type PermissionPageConfig = {
  groupKey: string;
  groupLabel: string;
  groupOrder: number;
  pageKey: string;
  pageLabel: string;
  pageOrder: number;
  actions: AdminPermissionAction[];
};

export const PROTECTED_FULL_ACCESS_ROLE_SLUG = 'protected-full-access';
export const DEVELOPER_ROOT_ROLE_SLUG = 'developer-root';
export const LEGACY_ADMIN_ROLE_SLUG = 'legacy-admin';
export const LEGACY_OPERATOR_ROLE_SLUG = 'legacy-operator';

export const PROTECTED_FULL_ACCESS_ROLE_NAME = 'Protected Full Access';
export const DEVELOPER_ROOT_ROLE_NAME = 'Developer';
export const LEGACY_ADMIN_ROLE_NAME = 'Legacy Admin';
export const LEGACY_OPERATOR_ROLE_NAME = 'Legacy Operator';

export const ADMIN_ACTOR_ROLES = [
  Role.OPERATOR,
  Role.ADMIN,
  Role.SUPERADMIN,
  Role.DEVELOPER,
] as const;

const ACTION_LABELS: Record<AdminPermissionAction, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  manage: 'Manage',
};

const ACTION_ORDERS: Record<AdminPermissionAction, number> = {
  view: 1,
  create: 2,
  edit: 3,
  delete: 4,
  manage: 5,
};

const PAGE_CONFIGS: PermissionPageConfig[] = [
  {
    groupKey: 'dashboard_settings',
    groupLabel: 'Dashboard & Pengaturan',
    groupOrder: 1,
    pageKey: 'dashboard',
    pageLabel: 'Dashboard',
    pageOrder: 1,
    actions: ['view'],
  },
  {
    groupKey: 'dashboard_settings',
    groupLabel: 'Dashboard & Pengaturan',
    groupOrder: 1,
    pageKey: 'analytics',
    pageLabel: 'Analytics',
    pageOrder: 2,
    actions: ['view', 'manage'],
  },
  {
    groupKey: 'dashboard_settings',
    groupLabel: 'Dashboard & Pengaturan',
    groupOrder: 1,
    pageKey: 'settings',
    pageLabel: 'Pengaturan Website',
    pageOrder: 3,
    actions: ['view', 'edit', 'manage'],
  },
  {
    groupKey: 'dashboard_settings',
    groupLabel: 'Dashboard & Pengaturan',
    groupOrder: 1,
    pageKey: 'admin_management',
    pageLabel: 'Manajemen Admin',
    pageOrder: 4,
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  {
    groupKey: 'content_management',
    groupLabel: 'Manajemen Konten',
    groupOrder: 2,
    pageKey: 'website_content',
    pageLabel: 'Layout Website',
    pageOrder: 1,
    actions: ['view', 'edit', 'manage'],
  },
  {
    groupKey: 'content_management',
    groupLabel: 'Manajemen Konten',
    groupOrder: 2,
    pageKey: 'hero_slides',
    pageLabel: 'Hero Slides',
    pageOrder: 2,
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  {
    groupKey: 'content_management',
    groupLabel: 'Manajemen Konten',
    groupOrder: 2,
    pageKey: 'homepage_products',
    pageLabel: 'Produk Homepage',
    pageOrder: 3,
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  {
    groupKey: 'content_management',
    groupLabel: 'Manajemen Konten',
    groupOrder: 2,
    pageKey: 'shop_products',
    pageLabel: 'Produk Shop',
    pageOrder: 4,
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  {
    groupKey: 'content_management',
    groupLabel: 'Manajemen Konten',
    groupOrder: 2,
    pageKey: 'testimonials',
    pageLabel: 'Testimonial',
    pageOrder: 5,
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  {
    groupKey: 'content_management',
    groupLabel: 'Manajemen Konten',
    groupOrder: 2,
    pageKey: 'activities',
    pageLabel: 'Kegiatan',
    pageOrder: 6,
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  {
    groupKey: 'content_management',
    groupLabel: 'Manajemen Konten',
    groupOrder: 2,
    pageKey: 'banners',
    pageLabel: 'Banners',
    pageOrder: 7,
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  {
    groupKey: 'content_management',
    groupLabel: 'Manajemen Konten',
    groupOrder: 2,
    pageKey: 'articles',
    pageLabel: 'Artikel',
    pageOrder: 8,
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  {
    groupKey: 'content_management',
    groupLabel: 'Manajemen Konten',
    groupOrder: 2,
    pageKey: 'media',
    pageLabel: 'Media Gallery',
    pageOrder: 9,
    actions: ['view', 'create', 'delete', 'manage'],
  },
  {
    groupKey: 'content_management',
    groupLabel: 'Manajemen Konten',
    groupOrder: 2,
    pageKey: 'team_management',
    pageLabel: 'Team & Mitra',
    pageOrder: 10,
    actions: ['view', 'create', 'edit', 'delete'],
  },
  {
    groupKey: 'testing_certification',
    groupLabel: 'Test & Sertifikasi',
    groupOrder: 3,
    pageKey: 'questions',
    pageLabel: 'Pertanyaan',
    pageOrder: 1,
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
  },
  {
    groupKey: 'testing_certification',
    groupLabel: 'Test & Sertifikasi',
    groupOrder: 3,
    pageKey: 'personality_results',
    pageLabel: 'Hasil Kepribadian',
    pageOrder: 2,
    actions: ['view', 'edit'],
  },
  {
    groupKey: 'testing_certification',
    groupLabel: 'Test & Sertifikasi',
    groupOrder: 3,
    pageKey: 'premium_results',
    pageLabel: 'Hasil Premium',
    pageOrder: 3,
    actions: ['view'],
  },
  {
    groupKey: 'testing_certification',
    groupLabel: 'Test & Sertifikasi',
    groupOrder: 3,
    pageKey: 'certificates',
    pageLabel: 'Sertifikat',
    pageOrder: 4,
    actions: ['view', 'create', 'edit', 'manage'],
  },
  {
    groupKey: 'operational_management',
    groupLabel: 'Operasional Pengguna',
    groupOrder: 4,
    pageKey: 'users',
    pageLabel: 'Data Pengguna',
    pageOrder: 1,
    actions: ['view', 'edit', 'delete', 'manage'],
  },
  {
    groupKey: 'operational_management',
    groupLabel: 'Operasional Pengguna',
    groupOrder: 4,
    pageKey: 'referrals',
    pageLabel: 'Referral',
    pageOrder: 2,
    actions: ['view', 'edit'],
  },
  {
    groupKey: 'operational_management',
    groupLabel: 'Operasional Pengguna',
    groupOrder: 4,
    pageKey: 'yayasan',
    pageLabel: 'Data Yayasan',
    pageOrder: 3,
    actions: ['view', 'manage'],
  },
  {
    groupKey: 'operational_management',
    groupLabel: 'Operasional Pengguna',
    groupOrder: 4,
    pageKey: 'mitra',
    pageLabel: 'Data Mitra',
    pageOrder: 4,
    actions: ['view', 'manage'],
  },
  {
    groupKey: 'operational_management',
    groupLabel: 'Operasional Pengguna',
    groupOrder: 4,
    pageKey: 'price_change_requests',
    pageLabel: 'Permintaan Harga',
    pageOrder: 5,
    actions: ['view', 'manage'],
  },
  {
    groupKey: 'finance_utility',
    groupLabel: 'Keuangan & Utility',
    groupOrder: 5,
    pageKey: 'revenue',
    pageLabel: 'Laporan Pendapatan',
    pageOrder: 1,
    actions: ['view', 'manage'],
  },
  {
    groupKey: 'finance_utility',
    groupLabel: 'Keuangan & Utility',
    groupOrder: 5,
    pageKey: 'transactions',
    pageLabel: 'Transaksi',
    pageOrder: 2,
    actions: ['view', 'manage'],
  },
  {
    groupKey: 'finance_utility',
    groupLabel: 'Keuangan & Utility',
    groupOrder: 5,
    pageKey: 'payment_ops',
    pageLabel: 'Monitoring Pembayaran',
    pageOrder: 3,
    actions: ['view', 'manage'],
  },
  {
    groupKey: 'finance_utility',
    groupLabel: 'Keuangan & Utility',
    groupOrder: 5,
    pageKey: 'yayasan_withdrawals',
    pageLabel: 'Pencairan Yayasan',
    pageOrder: 4,
    actions: ['view', 'manage'],
  },
  {
    groupKey: 'finance_utility',
    groupLabel: 'Keuangan & Utility',
    groupOrder: 5,
    pageKey: 'mitra_withdrawals',
    pageLabel: 'Pencairan Mitra',
    pageOrder: 5,
    actions: ['view', 'manage'],
  },
];

export const ADMIN_PERMISSION_CATALOG: AdminPermissionDefinition[] = PAGE_CONFIGS.flatMap((page) =>
  page.actions.map((action) => ({
    key: `${page.pageKey}.${action}`,
    groupKey: page.groupKey,
    groupLabel: page.groupLabel,
    groupOrder: page.groupOrder,
    pageKey: page.pageKey,
    pageLabel: page.pageLabel,
    pageOrder: page.pageOrder,
    actionKey: action,
    actionLabel: ACTION_LABELS[action],
    actionOrder: ACTION_ORDERS[action],
  })),
);

export const ADMIN_PERMISSION_KEYS = ADMIN_PERMISSION_CATALOG.map((item) => item.key);
export const ADMIN_PERMISSION_KEY_SET = new Set(ADMIN_PERMISSION_KEYS);

export const ADMIN_PAGE_PERMISSION_MAP = PAGE_CONFIGS.reduce<Record<string, PermissionPageConfig>>((acc, item) => {
  acc[item.pageKey] = item;
  return acc;
}, {});

export const ADMIN_PAGE_VIEW_PERMISSION_MAP = Object.keys(ADMIN_PAGE_PERMISSION_MAP).reduce<Record<string, string>>((acc, pageKey) => {
  if (ADMIN_PAGE_PERMISSION_MAP[pageKey].actions.includes('view')) {
    acc[pageKey] = `${pageKey}.view`;
  }
  return acc;
}, {});

export function isAdminActorRole(role?: Role | null) {
  return ADMIN_ACTOR_ROLES.includes(role as (typeof ADMIN_ACTOR_ROLES)[number]);
}

export function normalizeAdminPermissionKeys(keys: string[] = []) {
  const unique = Array.from(new Set(keys.filter((item) => ADMIN_PERMISSION_KEY_SET.has(item))));
  const keep = new Set<string>();

  Object.entries(ADMIN_PAGE_PERMISSION_MAP).forEach(([pageKey, page]) => {
    const pageKeys = unique.filter((item) => item.startsWith(`${pageKey}.`));
    const viewKey = ADMIN_PAGE_VIEW_PERMISSION_MAP[pageKey];
    const hasView = viewKey ? pageKeys.includes(viewKey) : true;

    pageKeys.forEach((item) => {
      const isView = item === viewKey;
      if (hasView || isView || !page.actions.includes('view')) {
        keep.add(item);
      }
    });
  });

  return ADMIN_PERMISSION_KEYS.filter((item) => keep.has(item));
}

export function getViewPermissionKey(permissionKey?: string | null) {
  const normalized = String(permissionKey || '').trim();
  if (!normalized) return null;
  const [pageKey, actionKey] = normalized.split('.');
  if (!pageKey || !actionKey) return null;
  if (actionKey === 'view') return normalized;
  return ADMIN_PAGE_VIEW_PERMISSION_MAP[pageKey] || null;
}

export function hasAdminPermission(permissionKeys: string[] = [], requiredPermission?: string | string[] | null) {
  if (!requiredPermission) return true;
  const normalizedKeys = new Set(normalizeAdminPermissionKeys(permissionKeys));
  const requiredList = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

  return requiredList.some((item) => {
    if (!item) return true;
    const viewKey = getViewPermissionKey(item);
    if (viewKey && !normalizedKeys.has(viewKey)) return false;
    return normalizedKeys.has(item);
  });
}

export function getLegacyRolePermissionKeys(role?: Role | null) {
  const normalizedRole = role || null;
  if (normalizedRole === Role.DEVELOPER || normalizedRole === Role.SUPERADMIN) {
    return ADMIN_PERMISSION_KEYS;
  }

  if (normalizedRole === Role.ADMIN) {
    return ADMIN_PERMISSION_KEYS.filter((key) => !key.startsWith('settings.') && !key.startsWith('admin_management.'));
  }

  if (normalizedRole === Role.OPERATOR) {
    return normalizeAdminPermissionKeys([
      'dashboard.view',
      'users.view',
      'referrals.view',
      'yayasan.view',
      'mitra.view',
      'price_change_requests.view',
    ]);
  }

  return [];
}

export function getSystemAdminRoles() {
  return [
    {
      name: DEVELOPER_ROOT_ROLE_NAME,
      slug: DEVELOPER_ROOT_ROLE_SLUG,
      description: 'Role root internal untuk developer dengan akses setara super admin.',
      isProtected: true,
      permissions: ADMIN_PERMISSION_KEYS,
    },
    {
      name: PROTECTED_FULL_ACCESS_ROLE_NAME,
      slug: PROTECTED_FULL_ACCESS_ROLE_SLUG,
      description: 'Role proteksi dengan akses penuh ke seluruh dashboard admin.',
      isProtected: true,
      permissions: ADMIN_PERMISSION_KEYS,
    },
    {
      name: LEGACY_ADMIN_ROLE_NAME,
      slug: LEGACY_ADMIN_ROLE_SLUG,
      description: 'Role legacy setara akses admin sebelum RBAC granular diterapkan.',
      isProtected: false,
      permissions: getLegacyRolePermissionKeys(Role.ADMIN),
    },
    {
      name: LEGACY_OPERATOR_ROLE_NAME,
      slug: LEGACY_OPERATOR_ROLE_SLUG,
      description: 'Role legacy setara akses operator sebelum RBAC granular diterapkan.',
      isProtected: false,
      permissions: getLegacyRolePermissionKeys(Role.OPERATOR),
    },
  ];
}

export function getMappedLegacyRoleSlug(role?: Role | null) {
  if (role === Role.DEVELOPER) return DEVELOPER_ROOT_ROLE_SLUG;
  if (role === Role.SUPERADMIN) return PROTECTED_FULL_ACCESS_ROLE_SLUG;
  if (role === Role.ADMIN) return LEGACY_ADMIN_ROLE_SLUG;
  if (role === Role.OPERATOR) return LEGACY_OPERATOR_ROLE_SLUG;
  return null;
}

export function isHiddenSystemAdminRoleSlug(roleSlug?: string | null) {
  return String(roleSlug || '').trim() === DEVELOPER_ROOT_ROLE_SLUG;
}

export function buildPermissionCatalogPayload() {
  const grouped = new Map<
    string,
    {
      groupKey: string;
      groupLabel: string;
      groupOrder: number;
      pages: Map<
        string,
        {
          pageKey: string;
          pageLabel: string;
          pageOrder: number;
          actions: AdminPermissionDefinition[];
        }
      >;
    }
  >();

  ADMIN_PERMISSION_CATALOG.forEach((item) => {
    if (!grouped.has(item.groupKey)) {
      grouped.set(item.groupKey, {
        groupKey: item.groupKey,
        groupLabel: item.groupLabel,
        groupOrder: item.groupOrder,
        pages: new Map(),
      });
    }

    const group = grouped.get(item.groupKey)!;
    if (!group.pages.has(item.pageKey)) {
      group.pages.set(item.pageKey, {
        pageKey: item.pageKey,
        pageLabel: item.pageLabel,
        pageOrder: item.pageOrder,
        actions: [],
      });
    }

    group.pages.get(item.pageKey)!.actions.push(item);
  });

  return Array.from(grouped.values())
    .sort((a, b) => a.groupOrder - b.groupOrder)
    .map((group) => ({
      groupKey: group.groupKey,
      groupLabel: group.groupLabel,
      groupOrder: group.groupOrder,
      pages: Array.from(group.pages.values())
        .sort((a, b) => a.pageOrder - b.pageOrder)
        .map((page) => ({
          pageKey: page.pageKey,
          pageLabel: page.pageLabel,
          pageOrder: page.pageOrder,
          actions: page.actions.sort((a, b) => a.actionOrder - b.actionOrder),
        })),
    }));
}
