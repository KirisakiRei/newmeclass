import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AiAnalysisService } from './ai-analysis.service';

@Controller('ai-analysis')
export class AiAnalysisController {
  constructor(private readonly service: AiAnalysisService) {}

  @UseGuards(JwtAuthGuard)
  @Post('analyze')
  analyze(@CurrentUser() user: any, @Body() body: any) {
    return this.service.analyze(user.sub, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-analyses')
  myAnalyses(@CurrentUser() user: any) {
    return this.service.myAnalyses(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('latest')
  latest(@CurrentUser() user: any) {
    return this.service.latest(user.sub);
  }
}
