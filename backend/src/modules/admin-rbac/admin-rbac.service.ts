import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { AccountStatus, Prisma, Role } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEVELOPER_ROOT_ROLE_SLUG,
  ADMIN_PERMISSION_KEYS,
  ADMIN_PERMISSION_KEY_SET,
  buildPermissionCatalogPayload,
  getMappedLegacyRoleSlug,
  getSystemAdminRoles,
  hasAdminPermission,
  isHiddenSystemAdminRoleSlug,
  isAdminActorRole,
  normalizeAdminPermissionKeys,
  PROTECTED_FULL_ACCESS_ROLE_SLUG,
} from './admin-permission-catalog';

@Injectable()
export class AdminRbacService {
  private readonly logger = new Logger(AdminRbacService.name);
  private syncPromise: Promise<void> | null = null;
  private readyPromise: Promise<void> | null = null;
  private hasSyncedCatalog = false;
  private hasBackfilledAdminUsers = false;

  constructor(private readonly prisma: PrismaService) {}

  private hashPassword(password: string) {
    return createHash('sha256').update(password).digest('hex');
  }

  private async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryablePrismaError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
  }

  private async runWithRetry<T>(label: string, task: () => Promise<T>, maxAttempts = 4): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await task();
      } catch (error) {
        lastError = error;
        if (!this.isRetryablePrismaError(error) || attempt >= maxAttempts) {
          throw error;
        }
        this.logger.warn(
          `${label} hit a retryable Prisma deadlock/write-conflict. Retrying attempt ${attempt + 1}/${maxAttempts}.`,
        );
        await this.sleep(150 * attempt);
      }
    }

    throw lastError;
  }

  getPermissionCatalog() {
    return buildPermissionCatalogPayload();
  }

  normalizePermissionKeys(keys: string[] = []) {
    return normalizeAdminPermissionKeys(keys);
  }

  canAccess(permissionKeys: string[] = [], permissions?: string[] | null) {
    return hasAdminPermission(permissionKeys, permissions || null);
  }

  async ensureSystemRoles() {
    const permissions = getSystemAdminRoles();
    const catalogMap = new Map(ADMIN_PERMISSION_KEYS.map((key) => [key, key]));

    await Promise.all(
      permissions.flatMap((role) =>
        role.permissions.map((key) => {
          if (!catalogMap.has(key)) {
            throw new Error(`Unknown admin permission key: ${key}`);
          }
          return key;
        }),
      ),
    );

    for (const definition of getSystemAdminRoles()) {
      const role = await this.prisma.adminRole.upsert({
        where: { slug: definition.slug },
        update: {
          name: definition.name,
          description: definition.description,
          isProtected: definition.isProtected,
          isSystem: true,
        },
        create: {
          name: definition.name,
          slug: definition.slug,
          description: definition.description,
          isProtected: definition.isProtected,
          isSystem: true,
        },
      });

      const permissionRows = await this.prisma.adminPermission.findMany({
        where: { key: { in: definition.permissions } },
        select: { id: true, key: true },
      });
      const permissionIds = permissionRows.map((item) => item.id);

      await this.prisma.adminRolePermission.deleteMany({ where: { roleId: role.id } });
      if (permissionIds.length > 0) {
        await this.prisma.adminRolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
          skipDuplicates: true,
        });
      }
    }
  }

  async ensurePermissionCatalog() {
    const payload = buildPermissionCatalogPayload().flatMap((group) =>
      group.pages.flatMap((page) => page.actions),
    );

    for (const item of payload) {
      await this.prisma.adminPermission.upsert({
        where: { key: item.key },
        update: {
          groupKey: item.groupKey,
          groupLabel: item.groupLabel,
          groupOrder: item.groupOrder,
          pageKey: item.pageKey,
          pageLabel: item.pageLabel,
          pageOrder: item.pageOrder,
          actionKey: item.actionKey,
          actionLabel: item.actionLabel,
          actionOrder: item.actionOrder,
          isSystem: true,
        },
        create: {
          key: item.key,
          groupKey: item.groupKey,
          groupLabel: item.groupLabel,
          groupOrder: item.groupOrder,
          pageKey: item.pageKey,
          pageLabel: item.pageLabel,
          pageOrder: item.pageOrder,
          actionKey: item.actionKey,
          actionLabel: item.actionLabel,
          actionOrder: item.actionOrder,
          isSystem: true,
        },
      });
    }

    const stalePermissions = await this.prisma.adminPermission.findMany({
      where: { key: { notIn: ADMIN_PERMISSION_KEYS } },
      select: { id: true },
    });
    if (stalePermissions.length > 0) {
      await this.prisma.adminRolePermission.deleteMany({
        where: { permissionId: { in: stalePermissions.map((item) => item.id) } },
      });
      await this.prisma.adminPermission.deleteMany({
        where: { id: { in: stalePermissions.map((item) => item.id) } },
      });
    }
  }

  async syncAdminRbacSeed(force = false) {
    if (this.hasSyncedCatalog && !force) {
      return;
    }
    if (this.syncPromise && !force) {
      return this.syncPromise;
    }

    const runner = this.runWithRetry('Admin RBAC sync', async () => {
      await this.ensurePermissionCatalog();
      await this.ensureSystemRoles();
      this.hasSyncedCatalog = true;
    });

    this.syncPromise = runner;
    try {
      await runner;
    } finally {
      if (this.syncPromise === runner) {
        this.syncPromise = null;
      }
    }
  }

  async backfillAdminUsers(force = false) {
    if (this.hasBackfilledAdminUsers && !force) {
      await this.syncAdminRbacSeed();
      return;
    }
    if (this.readyPromise && !force) {
      return this.readyPromise;
    }

    const runner = this.runWithRetry('Admin RBAC backfill', async () => {
      await this.syncAdminRbacSeed(force);

      const adminUsers = await this.prisma.user.findMany({
        where: {
          role: { in: [Role.ADMIN, Role.SUPERADMIN, Role.OPERATOR, Role.DEVELOPER] },
        },
        select: { id: true, email: true, role: true, username: true, adminRoleId: true, adminRole: { select: { slug: true } } },
      });

      const roleRows = await this.prisma.adminRole.findMany({
        select: { id: true, slug: true },
      });
      const roleIdBySlug = new Map(roleRows.map((item) => [item.slug, item.id]));

      const developerRoleId = roleIdBySlug.get(DEVELOPER_ROOT_ROLE_SLUG) || null;
      const developerEmail = String(process.env.SEED_DEVELOPER_EMAIL || 'developer@newme.id').trim().toLowerCase();
      const developerUsername = String(process.env.SEED_DEVELOPER_USERNAME || 'developer').trim().toLowerCase();
      const developerName = String(process.env.SEED_DEVELOPER_NAME || 'Developer Root').trim() || 'Developer Root';

      for (const user of adminUsers) {
        const updates: Record<string, any> = {};

        if (!user.username) {
          const emailPrefix =
            String(user.email || 'admin')
              .split('@')[0]
              .replace(/[^a-zA-Z0-9._-]+/g, '-')
              .replace(/^-+|-+$/g, '') || 'admin';
          const base = emailPrefix.toLowerCase().slice(0, 32);
          let candidate = base;
          let sequence = 0;
          while (true) {
            const conflict = await this.prisma.user.findFirst({
              where: { username: candidate, id: { not: user.id } },
              select: { id: true },
            });
            if (!conflict) break;
            sequence += 1;
            candidate = `${base}-${String(sequence).padStart(2, '0')}`.slice(0, 64);
          }
          updates.username = candidate;
        }

        const mappedRoleSlug = getMappedLegacyRoleSlug(user.role as any);
        const currentRoleSlug = user.adminRole?.slug || null;
        if (mappedRoleSlug && roleIdBySlug.has(mappedRoleSlug) && (!user.adminRoleId || currentRoleSlug !== mappedRoleSlug)) {
          updates.adminRoleId = roleIdBySlug.get(mappedRoleSlug);
        }

        if (Object.keys(updates).length > 0) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: updates,
          });
        }
      }

      const existingDeveloper =
        (await this.prisma.user.findUnique({
          where: { email: developerEmail },
          select: { id: true, username: true },
        }))
        || (await this.prisma.user.findFirst({
          where: { username: developerUsername },
          select: { id: true, email: true },
        }));

      if (existingDeveloper) {
        await this.prisma.user.update({
          where: { id: existingDeveloper.id },
          data: {
            email: developerEmail,
            username: developerUsername,
            fullName: developerName,
            role: Role.DEVELOPER,
            status: AccountStatus.ACTIVE,
            ...(developerRoleId ? { adminRoleId: developerRoleId } : {}),
          },
        });
      } else {
        await this.prisma.user.create({
          data: {
            email: developerEmail,
            username: developerUsername,
            fullName: developerName,
            passwordHash: this.hashPassword(String(process.env.SEED_DEVELOPER_PASSWORD || 'udahlupa')),
            role: Role.DEVELOPER,
            status: AccountStatus.ACTIVE,
            adminRoleId: developerRoleId,
            wallet: {
              create: {
                availableBalance: 0,
                reserveBalance: 0,
              },
            },
          },
        });
      }

      this.hasBackfilledAdminUsers = true;
    });

    this.readyPromise = runner;
    try {
      await runner;
    } finally {
      if (this.readyPromise === runner) {
        this.readyPromise = null;
      }
    }
  }

  async ensureAdminRbacReady(force = false) {
    await this.backfillAdminUsers(force);
  }

  async getAdminAccessContext(userId: string) {
    await this.ensureAdminRbacReady();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        adminRole: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !isAdminActorRole(user.role)) {
      return null;
    }

    const permissionKeys = normalizeAdminPermissionKeys(
      user.adminRole?.permissions?.map((item) => item.permission.key) || [],
    );

    return {
      user,
      adminRole: user.adminRole
        ? {
            id: user.adminRole.id,
            name: user.adminRole.name,
            slug: user.adminRole.slug,
            description: user.adminRole.description,
            isProtected: user.adminRole.isProtected,
            isSystem: user.adminRole.isSystem,
          }
        : null,
      permissionKeys,
      isProtectedAdminRole: Boolean(user.adminRole?.isProtected || user.adminRole?.slug === PROTECTED_FULL_ACCESS_ROLE_SLUG),
    };
  }

  isHiddenRole(roleSlug?: string | null) {
    return isHiddenSystemAdminRoleSlug(roleSlug);
  }

  async assertPermission(userId: string, permissions?: string | string[] | null) {
    const context = await this.getAdminAccessContext(userId);
    if (!context) {
      throw new ForbiddenException('Admin actor is required');
    }
    const requiredPermissions = Array.isArray(permissions)
      ? permissions.filter(Boolean)
      : permissions
        ? [permissions]
        : [];
    if (requiredPermissions.length === 0) {
      return context;
    }
    if (!this.canAccess(context.permissionKeys, requiredPermissions)) {
      throw new ForbiddenException('Insufficient admin permission');
    }
    return context;
  }

  async countProtectedAdmins(roleId?: string | null) {
    if (!roleId) return 0;
    return this.prisma.user.count({
      where: {
        adminRoleId: roleId,
        status: AccountStatus.ACTIVE,
      },
    });
  }

  async getProtectedRoleId() {
    const row = await this.prisma.adminRole.findUnique({
      where: { slug: PROTECTED_FULL_ACCESS_ROLE_SLUG },
      select: { id: true },
    });
    return row?.id || null;
  }

  sanitizeRequestedPermissionKeys(keys: string[] = []) {
    const filtered = keys.filter((item) => ADMIN_PERMISSION_KEY_SET.has(item));
    return normalizeAdminPermissionKeys(filtered);
  }
}
