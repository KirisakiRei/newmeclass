import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { CertificatePdfCacheService } from './certificate-pdf-cache.service';
import { CertificatePdfProcessor } from './certificate-pdf.processor';
import { CertificatesController } from './certificates.controller';

@Module({
  imports: [BullModule.registerQueue({ name: 'certificate-pdf' }), AuthModule],
  controllers: [CertificatesController],
  providers: [CertificatePdfCacheService, CertificatePdfProcessor],
})
export class CertificatesModule {}
