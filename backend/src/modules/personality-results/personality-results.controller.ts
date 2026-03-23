import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminPermission } from '../admin-rbac/admin-permission.decorator';
import { AdminPermissionGuard } from '../admin-rbac/admin-permission.guard';
import { PersonalityResultsService } from './personality-results.service';

@UseGuards(JwtAuthGuard, RolesGuard, AdminPermissionGuard)
@Roles(Role.OPERATOR, Role.ADMIN, Role.SUPERADMIN, Role.DEVELOPER)
@Controller('personality-results')
export class PersonalityResultsController {
  constructor(private readonly service: PersonalityResultsService) {}

  @Get()
  @AdminPermission('personality_results.view')
  getAll() { return this.service.getAll(); }

  @Get(':code')
  @AdminPermission('personality_results.view')
  getByCode(@Param('code') code: string) { return this.service.getByCode(code); }

  @Put(':code')
  @AdminPermission('personality_results.edit')
  update(@Param('code') code: string, @Body() body: any) { return this.service.update(code, body); }
}
