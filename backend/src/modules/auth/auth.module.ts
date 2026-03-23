import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminRbacModule } from '../admin-rbac/admin-rbac.module';
import { AuthController, AdminAuthController, YayasanAuthController, MitraAuthController } from './auth.controller';
import { AuthService } from './auth.service';

const MIN_ACCESS_TOKEN_SECONDS = 5 * 60;

function parseDurationToSeconds(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  const match = /^(\d+)([smhd])$/.exec(normalized);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (unit === 's') return amount;
  if (unit === 'm') return amount * 60;
  if (unit === 'h') return amount * 60 * 60;
  if (unit === 'd') return amount * 24 * 60 * 60;
  return null;
}

function resolveAccessTokenExpiry() {
  const configured = process.env.JWT_ACCESS_EXPIRES || '15m';
  const seconds = parseDurationToSeconds(configured);
  if (!seconds || seconds < MIN_ACCESS_TOKEN_SECONDS) {
    return '15m';
  }
  return configured;
}

@Global()
@Module({
  imports: [
    PrismaModule,
    AdminRbacModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: resolveAccessTokenExpiry() },
    }),
  ],
  controllers: [AuthController, AdminAuthController, YayasanAuthController, MitraAuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
