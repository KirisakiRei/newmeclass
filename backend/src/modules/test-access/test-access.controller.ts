import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TestAccessService } from './test-access.service';

@UseGuards(JwtAuthGuard)
@Controller('test-access')
export class TestAccessController {
  constructor(private readonly service: TestAccessService) {}

  @Get('check')
  check(@CurrentUser() user: any) {
    return this.service.check(user.sub);
  }

  @Post('record-free-test')
  record(@CurrentUser() user: any, @Query('category') category?: string) {
    return this.service.recordFreeTest(user.sub, category || 'personality');
  }
}
