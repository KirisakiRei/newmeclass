import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CertificatesController } from './certificates.controller';

@Module({ imports: [AuthModule], controllers: [CertificatesController] })
export class CertificatesModule {}
