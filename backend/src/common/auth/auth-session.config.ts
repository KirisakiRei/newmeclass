import { Role } from '@prisma/client';

const MIN_ACCESS_TOKEN_SECONDS = 5 * 60;
const USER_IDLE_TIMEOUT_MS = 20 * 60 * 1000;
const STAFF_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const USER_WARNING_THRESHOLD_MS = 3 * 60 * 1000;
const STAFF_WARNING_THRESHOLD_MS = 2 * 60 * 1000;
const USER_ACCESS_TOKEN_TTL = '20m';
const STAFF_ACCESS_TOKEN_TTL = '15m';
const DEFAULT_REFRESH_TTL_DAYS = 30;

const isUserRole = (role?: Role | null) => role === Role.USER;

const parseDurationToSeconds = (value?: string | null) => {
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
};

export const parseDurationToMs = (value?: string | null) => {
  const seconds = parseDurationToSeconds(value);
  return seconds ? seconds * 1000 : null;
};

const getConfiguredAccessTokenTtl = (role: Role) => (
  isUserRole(role)
    ? String(process.env.AUTH_ACCESS_TTL_USER || USER_ACCESS_TOKEN_TTL)
    : String(process.env.AUTH_ACCESS_TTL_STAFF || STAFF_ACCESS_TOKEN_TTL)
);

export const getAccessTokenExpiresIn = (role: Role) => {
  const configured = getConfiguredAccessTokenTtl(role);
  const seconds = parseDurationToSeconds(configured);
  if (!seconds || seconds < MIN_ACCESS_TOKEN_SECONDS) {
    return isUserRole(role) ? USER_ACCESS_TOKEN_TTL : STAFF_ACCESS_TOKEN_TTL;
  }
  return configured;
};

export const getAccessTokenTtlMs = (role: Role) => (
  parseDurationToMs(getAccessTokenExpiresIn(role))
  || (isUserRole(role) ? USER_IDLE_TIMEOUT_MS : STAFF_IDLE_TIMEOUT_MS)
);

export const getSessionIdleTimeoutMs = (role?: Role | null) => {
  const defaultIdleTimeoutMs = isUserRole(role) ? USER_IDLE_TIMEOUT_MS : STAFF_IDLE_TIMEOUT_MS;
  if (!role) return defaultIdleTimeoutMs;
  return Math.max(defaultIdleTimeoutMs, getAccessTokenTtlMs(role));
};

export const getSessionWarningThresholdMs = (role: Role) => (
  isUserRole(role) ? USER_WARNING_THRESHOLD_MS : STAFF_WARNING_THRESHOLD_MS
);

export const getRefreshTokenTtlMs = () => {
  const configuredDays = Number(process.env.AUTH_REFRESH_TTL_DAYS || DEFAULT_REFRESH_TTL_DAYS);
  const safeDays = Number.isFinite(configuredDays) && configuredDays > 0
    ? configuredDays
    : DEFAULT_REFRESH_TTL_DAYS;
  return safeDays * 24 * 60 * 60 * 1000;
};
