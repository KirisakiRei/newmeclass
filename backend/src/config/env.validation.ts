import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.string().default('5000'),
  API_PREFIX: z.string().default('api'),
  DATABASE_URL: z.string().min(1),
  FRONTEND_URL: z.string().optional(),
  PUBLIC_FRONTEND_URL: z.string().optional(),
  DASHBOARD_FRONTEND_URL: z.string().optional(),
  CMS_FRONTEND_URL: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(16),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_COOKIE_SECURE: z.string().optional(),
  AUTH_COOKIE_SAME_SITE: z.string().optional(),
  AUTH_ACCESS_TTL_USER: z.string().optional(),
  AUTH_ACCESS_TTL_STAFF: z.string().optional(),
  AUTH_REFRESH_TTL_DAYS: z.string().optional(),
  AUTH_ENABLE_GOOGLE: z.string().optional(),
  AUTH_ENABLE_PASSWORD_RESET: z.string().optional(),
  CSP_REPORT_ONLY: z.string().optional(),
  AUTH_BRIDGE_TICKET_TTL_SECONDS: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_NAME: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  MIDTRANS_SERVER_KEY: z.string().min(1),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.string().default('6379'),
});

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new BadRequestException(parsed.error.flatten().fieldErrors);
  }
  const data = parsed.data;
  const passwordResetEnabled = String(data.AUTH_ENABLE_PASSWORD_RESET || 'true').trim().toLowerCase() !== 'false';

  if (passwordResetEnabled) {
    const missingMailEnv = [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS',
      'SMTP_FROM_EMAIL',
    ].filter((key) => !String(data[key as keyof typeof data] || '').trim());

    if (missingMailEnv.length) {
      throw new BadRequestException({
        SMTP: [`Password reset aktif tetapi konfigurasi mail belum lengkap: ${missingMailEnv.join(', ')}`],
      });
    }
  }

  return data;
}
