import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TestAccessController } from './test-access.controller';
import { TestAccessService } from './test-access.service';

@Module({ imports: [AuthModule], controllers: [TestAccessController], providers: [TestAccessService], exports: [TestAccessService] })
export class TestAccessModule {}
