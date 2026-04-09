import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminActivityLogService } from '../admin-activity/admin-activity.service';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminManagementService } from './admin-management.service';
import { CreateAdminRoleDto } from './dto/create-admin-role.dto';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminPasswordDto } from './dto/update-admin-password.dto';
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
@Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
export class AdminManagementController {
  constructor(
    private readonly adminManagementService: AdminManagementService,
    private readonly prisma: PrismaService,
    private readonly adminActivityLogService: AdminActivityLogService,
  ) {}

  @Get('permissions')
  @AdminPermission('admin_management.view')
  getPermissions() {
    return this.adminManagementService.getPermissionCatalog();
  }

  @Get('roles')
  @AdminPermission('admin_management.view')
  getRoles() {
    return this.adminManagementService.listRoles();
  }

  @Post('roles')
  @AdminPermission('admin_management.create')
  async createRole(@CurrentUser() user: any, @Req() req: any, @Body() body: CreateAdminRoleDto) {
    const created = await this.adminManagementService.createRole(body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_ROLE_CREATED',
      category: 'admin_management',
      targetType: 'admin_role',
      targetId: created.id,
      targetLabel: created.name,
      summary: `Role admin ${created.name} dibuat.`,
      after: {
        name: created.name,
        slug: created.slug,
        description: created.description,
        permissionKeys: created.permissionKeys,
      },
      meta: {
        permissionCount: Array.isArray(created.permissionKeys) ? created.permissionKeys.length : 0,
      },
      ipAddress: req?.ip,
    });
    return created;
  }

  @Put('roles/:roleId')
  @AdminPermission('admin_management.edit')
  async updateRole(@CurrentUser() user: any, @Req() req: any, @Param('roleId') roleId: string, @Body() body: UpdateAdminRoleDto) {
    const before = await this.adminManagementService.getRoleById(roleId);
    const updated = await this.adminManagementService.updateRole(roleId, body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_ROLE_UPDATED',
      category: 'admin_management',
      targetType: 'admin_role',
      targetId: updated.id,
      targetLabel: updated.name,
      summary: `Role admin ${updated.name} diubah.`,
      before: {
        name: before.name,
        slug: before.slug,
        description: before.description,
        permissionKeys: before.permissionKeys,
      },
      after: {
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
        permissionKeys: updated.permissionKeys,
      },
      meta: {
        permissionCount: Array.isArray(updated.permissionKeys) ? updated.permissionKeys.length : 0,
      },
      ipAddress: req?.ip,
    });
    return updated;
  }

  @Delete('roles/:roleId')
  @AdminPermission('admin_management.delete')
  async deleteRole(@CurrentUser() user: any, @Req() req: any, @Param('roleId') roleId: string) {
    const before = await this.adminManagementService.getRoleById(roleId);
    const result = await this.adminManagementService.deleteRole(roleId);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_ROLE_DELETED',
      category: 'admin_management',
      targetType: 'admin_role',
      targetId: before.id,
      targetLabel: before.name,
      summary: `Role admin ${before.name} dihapus.`,
      before: {
        name: before.name,
        slug: before.slug,
        description: before.description,
        permissionKeys: before.permissionKeys,
      },
      ipAddress: req?.ip,
    });
    return result;
  }

  @Get('users')
  @AdminPermission('admin_management.view')
  getAdminUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.adminManagementService.listAdminUsers({ page, pageSize, search });
  }

  @Post('users')
  @AdminPermission('admin_management.create')
  async createAdminUser(@CurrentUser() user: any, @Req() req: any, @Body() body: CreateAdminUserDto) {
    const created = await this.adminManagementService.createAdminUser(body, user?.sub);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_USER_CREATED',
      category: 'admin_management',
      targetType: 'admin_user',
      targetId: created?.id || created?._id || null,
      targetLabel: created?.fullName || created?.username || created?.email || 'User Admin',
      summary: `User admin ${created?.email || created?.username || ''} dibuat.`,
      after: {
        fullName: created?.fullName || created?.username || null,
        username: created?.username || null,
        email: created?.email || null,
        adminRoleId: created?.adminRoleId || null,
      },
      ipAddress: req?.ip,
    });
    return created;
  }

  @Put('users/:adminId')
  @AdminPermission('admin_management.edit')
  async updateAdminUser(@CurrentUser() user: any, @Req() req: any, @Param('adminId') adminId: string, @Body() body: UpdateAdminUserDto) {
    const before = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: { adminRole: true },
    });
    const updated = await this.adminManagementService.updateAdminUser(adminId, body, user?.sub);
    const after = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: { adminRole: true },
    });
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_USER_UPDATED',
      category: 'admin_management',
      targetType: 'admin_user',
      targetId: adminId,
      targetLabel: after?.fullName || after?.username || updated?.email || 'User Admin',
      summary: `Data user admin ${after?.email || updated?.email || ''} diperbarui.`,
      before: before ? {
        fullName: before.fullName,
        username: before.username,
        email: before.email,
        adminRole: before.adminRole?.name || null,
      } : null,
      after: after ? {
        fullName: after.fullName,
        username: after.username,
        email: after.email,
        adminRole: after.adminRole?.name || null,
      } : null,
      ipAddress: req?.ip,
    });
    return updated;
  }

  @Put('users/:adminId/change-password')
  @AdminPermission('admin_management.manage')
  async changeAdminPassword(@CurrentUser() user: any, @Req() req: any, @Param('adminId') adminId: string, @Body() body: UpdateAdminPasswordDto) {
    const target = await this.prisma.user.findUnique({ where: { id: adminId } });
    const result = await this.adminManagementService.changeAdminPassword(adminId, body);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_USER_PASSWORD_CHANGED',
      category: 'admin_management',
      targetType: 'admin_user',
      targetId: adminId,
      targetLabel: target?.fullName || target?.username || target?.email || 'User Admin',
      summary: `Password user admin ${target?.email || target?.username || ''} diubah.`,
      meta: {
        email: target?.email || null,
      },
      ipAddress: req?.ip,
    });
    return result;
  }

  @Delete('users/:adminId')
  @AdminPermission('admin_management.delete')
  async deleteAdminUser(@CurrentUser() user: any, @Req() req: any, @Param('adminId') adminId: string) {
    const before = await this.prisma.user.findUnique({
      where: { id: adminId },
      include: { adminRole: true },
    });
    const result = await this.adminManagementService.deleteAdminUser(adminId);
    this.adminActivityLogService.record({
      actorUserId: user?.sub,
      action: 'ADMIN_USER_DELETED',
      category: 'admin_management',
      targetType: 'admin_user',
      targetId: adminId,
      targetLabel: before?.fullName || before?.username || before?.email || 'User Admin',
      summary: `User admin ${before?.email || before?.username || ''} dihapus.`,
      before: before ? {
        fullName: before.fullName,
        username: before.username,
        email: before.email,
        adminRole: before.adminRole?.name || null,
      } : null,
      ipAddress: req?.ip,
    });
    return result;
  }
}
