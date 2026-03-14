import { Module } from '@nestjs/common';
import { PersonalityResultsController } from './personality-results.controller';
import { PersonalityResultsService } from './personality-results.service';

@Module({ controllers: [PersonalityResultsController], providers: [PersonalityResultsService], exports: [PersonalityResultsService] })
export class PersonalityResultsModule {}
