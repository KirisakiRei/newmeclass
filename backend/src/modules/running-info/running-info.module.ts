import { Module } from '@nestjs/common';
import { RunningInfoController } from './running-info.controller';

@Module({ controllers: [RunningInfoController] })
export class RunningInfoModule {}
