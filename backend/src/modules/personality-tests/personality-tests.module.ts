import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { QuestionsModule } from '../questions/questions.module';
import { TestResultsModule } from '../test-results/test-results.module';
import { PersonalityTestsController } from './personality-tests.controller';
import { PersonalityTestsService } from './personality-tests.service';

@Module({
  imports: [AuthModule, QuestionsModule, TestResultsModule],
  controllers: [PersonalityTestsController],
  providers: [PersonalityTestsService],
})
export class PersonalityTestsModule {}
