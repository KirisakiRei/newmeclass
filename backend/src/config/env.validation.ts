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
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  AUTH_BRIDGE_TICKET_TTL_SECONDS: z.string().optional(),
  MIDTRANS_SERVER_KEY: z.string().min(1),
  REDIS_HOST: z.string().default('127.0.0.1'),
  REDIS_PORT: z.string().default('6379'),
});

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    throw new BadRequestException(parsed.error.flatten().fieldErrors);
  }
  return parsed.data;
}
