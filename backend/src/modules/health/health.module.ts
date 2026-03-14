import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
