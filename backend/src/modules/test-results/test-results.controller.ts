import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TestResultsService } from './test-results.service';

@Controller('test-results')
export class TestResultsController {
  constructor(private readonly service: TestResultsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  submit(@CurrentUser() user: any, @Body() body: any) {
    return this.service.submitNewmeTest(user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.getResultById(id, user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check-free-test/:userId')
  checkFree(@CurrentUser() user: any, @Param('userId') userId: string) {
    if (user.sub !== userId && ![Role.ADMIN, Role.SUPERADMIN].includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return this.service.checkHasUsedFreeTest(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Get('admin/premium-results')
  adminPremium() {
    return this.service.adminPremiumList();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Get('admin/premium-results/:userId')
  adminPremiumByUser(@Param('userId') userId: string) {
    return this.service.adminPremiumByUser(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Get('admin/stats')
  adminStats() {
    return this.service.adminStats();
  }
}
