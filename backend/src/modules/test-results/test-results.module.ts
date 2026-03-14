import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ScoringModule } from '../scoring/scoring.module';
import { TestAccessModule } from '../test-access/test-access.module';
import { TestResultsController } from './test-results.controller';
import { TestResultsService } from './test-results.service';

@Module({
  imports: [AuthModule, PrismaModule, ScoringModule, TestAccessModule],
  controllers: [TestResultsController],
  providers: [TestResultsService],
  exports: [TestResultsService],
})
export class TestResultsModule {}
