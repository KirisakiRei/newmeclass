import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, Role } from '@prisma/client';
import { hashLocalPassword } from 'src/common/auth/password.utils';
import { AuthService } from '../auth/auth.service';
import { DEVELOPER_ROOT_ROLE_SLUG, isAdminActorRole, isHiddenSystemAdminRoleSlug } from '../admin-rbac/admin-permission-catalog';
import { AdminRbacService } from '../admin-rbac/admin-rbac.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminRoleDto } from './dto/create-admin-role.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminPasswordDto } from './dto/update-admin-password.dto';
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Injectable()
export class AdminManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly adminRbacService: AdminRbacService,
  ) {}

  private normalizeUsername(username?: string | null) {
    return String(username || '').trim().toLowerCase();
  }

  private normalizeEmail(email?: string | null) {
    return String(email || '').trim().toLowerCase();
  }

  private normalizeRoleName(name?: string | null) {
    return String(name || '').trim();
  }

  private slugifyRoleName(name: string) {
    return this.normalizeRoleName(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  private async assertRoleExists(roleId?: string | null) {
    const role = await this.prisma.adminRole.findUnique({
      where: { id: String(roleId || '') },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });
    if (!role || isHiddenSystemAdminRoleSlug(role.slug)) {
      throw new NotFoundException('Admin role not found');
    }
    return role;
  }

  private async assertAssignableRole(roleId?: string | null, actorUserId?: string | null) {
    const role = await this.assertRoleExists(roleId);
    if (!role.isProtected) {
      return role;
    }

    const actorContext = actorUserId ? await this.adminRbacService.getAdminAccessContext(actorUserId) : null;
    if (!actorContext?.isProtectedAdminRole) {
      throw new ForbiddenException('Only protected full access admins can assign the protected role');
    }

    return role;
  }

  private async assertVisibleAdminUserTarget(adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        role: true,
        adminRoleId: true,
        email: true,
        username: true,
        adminRole: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (
      !user
      || !isAdminActorRole(user.role)
      || user.role === Role.DEVELOPER
      || isHiddenSystemAdminRoleSlug(user.adminRole?.slug)
    ) {
      throw new NotFoundException('Admin user not found');
    }

    return user;
  }

  private async assertCanMutateProtectedAdmin(targetUserId: string, nextRoleId?: string | null) {
    const protectedRoleId = await this.adminRbacService.getProtectedRoleId();
    if (!protectedRoleId) return;

    const current = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, adminRoleId: true },
    });
    if (!current || current.adminRoleId !== protectedRoleId) return;
    if (nextRoleId && nextRoleId === protectedRoleId) return;

    const protectedCount = await this.adminRbacService.countProtectedAdmins(protectedRoleId);
    if (protectedCount <= 1) {
      throw new ForbiddenException('The last protected full access admin cannot be downgraded or removed');
    }
  }

  async getPermissionCatalog() {
    await this.adminRbacService.syncAdminRbacSeed();
    return this.adminRbacService.getPermissionCatalog();
  }

  async listRoles() {
    await this.adminRbacService.syncAdminRbacSeed();
    const roles = await this.prisma.adminRole.findMany({
      where: {
        slug: { not: DEVELOPER_ROOT_ROLE_SLUG },
      },
      orderBy: [
        { isProtected: 'desc' },
        { createdAt: 'asc' },
      ],
      include: {
        permissions: {
          include: { permission: true },
          orderBy: { permission: { groupOrder: 'asc' } },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      _id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      isProtected: role.isProtected,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissionKeys: role.permissions.map((item) => item.permission.key),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  async createRole(body: CreateAdminRoleDto) {
    await this.adminRbacService.syncAdminRbacSeed();
    const name = this.normalizeRoleName(body.name);
    const slugBase = this.slugifyRoleName(name);
    if (!name || !slugBase) {
      throw new BadRequestException('Role name is required');
    }

    const existingName = await this.prisma.adminRole.findFirst({
      where: { name: { equals: name } },
      select: { id: true },
    });
    if (existingName) {
      throw new ConflictException('Role name already exists');
    }

    let slug = slugBase;
    let sequence = 0;
    while (true) {
      const conflict = await this.prisma.adminRole.findUnique({ where: { slug }, select: { id: true } });
      if (!conflict) break;
      sequence += 1;
      slug = `${slugBase}-${sequence}`;
    }

    const permissionKeys = this.adminRbacService.sanitizeRequestedPermissionKeys(body.permissionKeys || []);
    const permissionRows = await this.prisma.adminPermission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true },
    });

    const role = await this.prisma.adminRole.create({
      data: {
        name,
        slug,
        description: body.description || null,
        isProtected: false,
        isSystem: false,
        permissions: {
          createMany: {
            data: permissionRows.map((item) => ({ permissionId: item.id })),
            skipDuplicates: true,
          },
        },
      },
    });

    return this.getRoleById(role.id);
  }

  async getRoleById(roleId: string) {
    const role = await this.prisma.adminRole.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: {
          select: { users: true },
        },
      },
    });
    if (!role) {
      throw new NotFoundException('Admin role not found');
    }

    return {
      id: role.id,
      _id: role.id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      isProtected: role.isProtected,
      isSystem: role.isSystem,
      userCount: role._count.users,
      permissionKeys: role.permissions.map((item) => item.permission.key),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  async updateRole(roleId: string, body: UpdateAdminRoleDto) {
    await this.adminRbacService.syncAdminRbacSeed();
    const role = await this.assertRoleExists(roleId);
    if (role.isProtected) {
      throw new ForbiddenException('Protected full access role cannot be modified');
    }

    const data: Record<string, any> = {};
    if (body.name !== undefined) {
      const name = this.normalizeRoleName(body.name);
      if (!name) {
        throw new BadRequestException('Role name is required');
      }
      const existingName = await this.prisma.adminRole.findFirst({
        where: { name: { equals: name }, id: { not: roleId } },
        select: { id: true },
      });
      if (existingName) {
        throw new ConflictException('Role name already exists');
      }
      data.name = name;
      data.slug = this.slugifyRoleName(name);
    }
    if (body.description !== undefined) {
      data.description = body.description || null;
    }

    await this.prisma.adminRole.update({
      where: { id: roleId },
      data,
    });

    if (body.permissionKeys) {
      const permissionKeys = this.adminRbacService.sanitizeRequestedPermissionKeys(body.permissionKeys);
      const permissionRows = await this.prisma.adminPermission.findMany({
        where: { key: { in: permissionKeys } },
        select: { id: true },
      });
      await this.prisma.adminRolePermission.deleteMany({ where: { roleId } });
      await this.prisma.adminRolePermission.createMany({
        data: permissionRows.map((item) => ({ roleId, permissionId: item.id })),
        skipDuplicates: true,
      });
    }

    return this.getRoleById(roleId);
  }

  async deleteRole(roleId: string) {
    const role = await this.assertRoleExists(roleId);
    if (role.isProtected) {
      throw new ForbiddenException('Protected full access role cannot be deleted');
    }
    if (role._count.users > 0) {
      throw new BadRequestException('Role is still assigned to admin users');
    }
    await this.prisma.adminRolePermission.deleteMany({ where: { roleId } });
    await this.prisma.adminRole.delete({ where: { id: roleId } });
    return { message: 'Admin role deleted' };
  }

  async listAdminUsers(query: { page?: string | number; pageSize?: string | number; search?: string } = {}) {
    await this.adminRbacService.syncAdminRbacSeed();
    return this.authService.getAdminUsers(query);
  }

  async createAdminUser(body: CreateAdminUserDto, actorUserId?: string | null) {
    await this.adminRbacService.syncAdminRbacSeed();
    const username = this.normalizeUsername(body.username);
    const email = this.normalizeEmail(body.email);
    if (!username) {
      throw new BadRequestException('Username is required');
    }
    const role = await this.assertAssignableRole(body.adminRoleId, actorUserId);

    const [existingUsername, existingEmail] = await Promise.all([
      this.prisma.user.findFirst({ where: { username }, select: { id: true } }),
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
    ]);
    if (existingUsername) {
      throw new ConflictException('Username already registered');
    }
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    const created = await this.prisma.user.create({
      data: {
        username,
        email,
        fullName: username,
        passwordHash: await hashLocalPassword(body.password),
        role: Role.ADMIN,
        status: AccountStatus.ACTIVE,
        adminRoleId: role.id,
      },
      select: { id: true },
    });

    return this.authService.getProfile(created.id);
  }

  async updateAdminUser(adminId: string, body: UpdateAdminUserDto, actorUserId?: string | null) {
    await this.adminRbacService.syncAdminRbacSeed();
    const existing = await this.assertVisibleAdminUserTarget(adminId);

    const data: Record<string, any> = {};
    if (body.username !== undefined) {
      const username = this.normalizeUsername(body.username);
      if (!username) {
        throw new BadRequestException('Username is required');
      }
      const conflict = await this.prisma.user.findFirst({
        where: { username, id: { not: adminId } },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException('Username already registered');
      }
      data.username = username;
      data.fullName = username;
    }

    if (body.email !== undefined) {
      const email = this.normalizeEmail(body.email);
      const conflict = await this.prisma.user.findFirst({
        where: { email, id: { not: adminId } },
        select: { id: true },
      });
      if (conflict) {
        throw new ConflictException('Email already registered');
      }
      data.email = email;
    }

    if (body.password) {
      data.passwordHash = await hashLocalPassword(body.password);
    }

    if (body.adminRoleId !== undefined) {
      await this.assertCanMutateProtectedAdmin(adminId, body.adminRoleId);
      const role = await this.assertAssignableRole(body.adminRoleId, actorUserId);
      data.adminRoleId = role.id;
    }

    await this.prisma.user.update({
      where: { id: adminId },
      data,
    });

    return this.authService.getProfile(adminId);
  }

  async changeAdminPassword(adminId: string, body: UpdateAdminPasswordDto) {
    await this.assertVisibleAdminUserTarget(adminId);

    await this.prisma.user.update({
      where: { id: adminId },
      data: { passwordHash: await hashLocalPassword(body.newPassword) },
    });

    return { message: 'Admin password updated' };
  }

  async deleteAdminUser(adminId: string) {
    const existing = await this.assertVisibleAdminUserTarget(adminId);

    await this.assertCanMutateProtectedAdmin(adminId);
    await this.prisma.user.delete({ where: { id: adminId } });
    return { message: 'Admin user deleted' };
  }
}
