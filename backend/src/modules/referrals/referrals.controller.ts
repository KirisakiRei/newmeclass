import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ReferralsService } from './referrals.service';
import { UpdateReferralSettingsDto } from './dto/update-referral-settings.dto';
import { ReferralTransactionsQueryDto } from './dto/referral-transactions-query.dto';

@Controller('referrals')
export class ReferralsController {
  constructor(private readonly service: ReferralsService) {}

  @Get('settings')
  getSettings() {
    return this.service.getSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Put('settings')
  updateSettings(@Body() body: UpdateReferralSettingsDto) {
    return this.service.updateSettings(body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Get('leaderboard')
  leaderboard(@Query('limit') limit = '20') {
    return this.service.leaderboard(Number(limit));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Get('transactions')
  transactions(@Query() query: ReferralTransactionsQueryDto) {
    return this.service.transactions(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  @Get('stats')
  stats() {
    return this.service.stats();
  }
}
