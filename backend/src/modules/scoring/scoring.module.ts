import { Module } from '@nestjs/common';
import { CoreScoringCatalogService } from './core-scoring-catalog.service';
import { CoreScoringEngineService } from './core-scoring.engine.service';
import { ScoringService } from './scoring.service';

@Module({
  providers: [ScoringService, CoreScoringEngineService, CoreScoringCatalogService],
  exports: [ScoringService, CoreScoringEngineService, CoreScoringCatalogService],
})
export class ScoringModule {}
