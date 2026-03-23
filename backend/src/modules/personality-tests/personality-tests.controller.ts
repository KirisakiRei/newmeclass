import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PersonalityTestsService } from './personality-tests.service';
import { SubmitCorePersonalityTestDto } from './dto/submit-core-personality-test.dto';
import { SubmitPersonalityTestDto } from './dto/submit-personality-test.dto';

@Controller('personality-tests')
export class PersonalityTestsController {
  constructor(private readonly service: PersonalityTestsService) {}

  @Get('questions/:testType')
  getQuestions(@Param('testType') testType: string, @Query('include_premium') includePremium: string) {
    return this.service.getQuestions(testType, includePremium === 'true');
  }

  @UseGuards(JwtAuthGuard)
  @Post('submit')
  submit(@CurrentUser() user: any, @Body() body: SubmitPersonalityTestDto) {
    return this.service.submit({ ...body, userId: body.userId || user.sub });
  }

  @UseGuards(JwtAuthGuard)
  @Get('core-premium/questions')
  getCorePremiumQuestions(@CurrentUser() user: any) {
    return this.service.getCorePremiumQuestions(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('core-premium/submit')
  submitCorePremium(@CurrentUser() user: any, @Body() body: SubmitCorePersonalityTestDto) {
    return this.service.submitCorePremium(user.sub, body);
  }

  @Get('descriptions/:personalityType')
  description(@Param('personalityType') personalityType: string) {
    return this.service.description(personalityType);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-results')
  myResults(@CurrentUser() user: any) {
    return this.service.myResults(user.sub);
  }

  @Get('stats')
  stats() {
    return this.service.stats();
  }
}
