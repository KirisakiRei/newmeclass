import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuestionsModule } from '../questions/questions.module';
import { ScoringModule } from '../scoring/scoring.module';
import { TestResultsModule } from '../test-results/test-results.module';
import { PersonalityTestsController } from './personality-tests.controller';
import { PersonalityTestsService } from './personality-tests.service';

@Module({
  imports: [AuthModule, QuestionsModule, TestResultsModule, ScoringModule],
  controllers: [PersonalityTestsController],
  providers: [PersonalityTestsService],
})
export class PersonalityTestsModule {}
