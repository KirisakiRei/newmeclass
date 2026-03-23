import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WebsiteContentController } from './website-content.controller';
import { WebsiteContentService } from './website-content.service';

@Module({
  imports: [AuthModule],
  controllers: [WebsiteContentController],
  providers: [WebsiteContentService],
})
export class WebsiteContentModule {}
