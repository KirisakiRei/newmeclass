import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiAnalysisController } from './ai-analysis.controller';
import { AiAnalysisService } from './ai-analysis.service';

@Module({ imports: [AuthModule], controllers: [AiAnalysisController], providers: [AiAnalysisService] })
export class AiAnalysisModule {}
