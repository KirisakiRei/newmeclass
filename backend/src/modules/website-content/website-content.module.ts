import { Module } from '@nestjs/common';
import { WebsiteContentController } from './website-content.controller';
import { WebsiteContentService } from './website-content.service';

@Module({ controllers: [WebsiteContentController], providers: [WebsiteContentService] })
export class WebsiteContentModule {}
