import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
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
  constructor(private readonly adminManagementService: AdminManagementService) {}

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
  createRole(@Body() body: CreateAdminRoleDto) {
    return this.adminManagementService.createRole(body);
  }

  @Put('roles/:roleId')
  @AdminPermission('admin_management.edit')
  updateRole(@Param('roleId') roleId: string, @Body() body: UpdateAdminRoleDto) {
    return this.adminManagementService.updateRole(roleId, body);
  }

  @Delete('roles/:roleId')
  @AdminPermission('admin_management.delete')
  deleteRole(@Param('roleId') roleId: string) {
    return this.adminManagementService.deleteRole(roleId);
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
  createAdminUser(@CurrentUser() user: any, @Body() body: CreateAdminUserDto) {
    return this.adminManagementService.createAdminUser(body, user?.sub);
  }

  @Put('users/:adminId')
  @AdminPermission('admin_management.edit')
  updateAdminUser(@CurrentUser() user: any, @Param('adminId') adminId: string, @Body() body: UpdateAdminUserDto) {
    return this.adminManagementService.updateAdminUser(adminId, body, user?.sub);
  }

  @Put('users/:adminId/change-password')
  @AdminPermission('admin_management.manage')
  changeAdminPassword(@Param('adminId') adminId: string, @Body() body: UpdateAdminPasswordDto) {
    return this.adminManagementService.changeAdminPassword(adminId, body);
  }

  @Delete('users/:adminId')
  @AdminPermission('admin_management.delete')
  deleteAdminUser(@Param('adminId') adminId: string) {
    return this.adminManagementService.deleteAdminUser(adminId);
  }
}
