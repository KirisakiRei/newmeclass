import { Module } from '@nestjs/common';
import { LandingCmsController } from './landing-cms.controller';
import { LandingCmsService } from './landing-cms.service';

@Module({
  controllers: [LandingCmsController],
  providers: [LandingCmsService],
})
export class LandingCmsModule {}
