import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { SettingsModule } from './modules/settings/settings.module';
import { WebsiteContentModule } from './modules/website-content/website-content.module';
import { ProductsModule } from './modules/products/products.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { TestResultsModule } from './modules/test-results/test-results.module';
import { PersonalityTestsModule } from './modules/personality-tests/personality-tests.module';
import { PersonalityResultsModule } from './modules/personality-results/personality-results.module';
import { AiAnalysisModule } from './modules/ai-analysis/ai-analysis.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { UserPaymentsModule } from './modules/user-payments/user-payments.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { YayasanModule } from './modules/yayasan/yayasan.module';
import { MitraModule } from './modules/mitra/mitra.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadModule } from './modules/upload/upload.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { InstitutionsModule } from './modules/institutions/institutions.module';
import { RegistrationsModule } from './modules/registrations/registrations.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { TestAccessModule } from './modules/test-access/test-access.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { MediaModule } from './modules/media/media.module';
import { BannersModule } from './modules/banners/banners.module';
import { LandingCmsModule } from './modules/landing-cms/landing-cms.module';
import { RunningInfoModule } from './modules/running-info/running-info.module';
import { QueueModule } from './modules/queue/queue.module';
import { ScoringModule } from './modules/scoring/scoring.module';
import { AdminRbacModule } from './modules/admin-rbac/admin-rbac.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { SmartThrottlerGuard } from './common/guards/smart-throttler.guard';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.RATE_LIMIT_TTL || 60) * 1000,
        limit: Number(process.env.RATE_LIMIT_LIMIT || 120),
      },
    ]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB || 0),
      },
      prefix: process.env.BULLMQ_PREFIX || 'newme',
    }),
    AdminRbacModule,
    PrismaModule,
    QueueModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AdminModule,
    SettingsModule,
    WebsiteContentModule,
    ProductsModule,
    ArticlesModule,
    MediaModule,
    BannersModule,
    LandingCmsModule,
    RunningInfoModule,
    QuestionsModule,
    ScoringModule,
    TestResultsModule,
    TestAccessModule,
    PersonalityTestsModule,
    PersonalityResultsModule,
    AiAnalysisModule,
    PaymentsModule,
    WalletModule,
    UserPaymentsModule,
    TransactionsModule,
    FinanceModule,
    ReferralsModule,
    CertificatesModule,
    YayasanModule,
    MitraModule,
    UploadModule,
    ContactsModule,
    InstitutionsModule,
    RegistrationsModule,
    AnalyticsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: SmartThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
