import { createHash } from 'crypto';
import { compare, hash } from 'bcryptjs';

const DEFAULT_BCRYPT_ROUNDS = 12;

const normalizeRounds = (value: string | undefined) => {
  const parsed = Number(value || DEFAULT_BCRYPT_ROUNDS);
  if (!Number.isInteger(parsed) || parsed < 8 || parsed > 15) {
    return DEFAULT_BCRYPT_ROUNDS;
  }
  return parsed;
};

export const isBcryptHash = (value?: string | null) => String(value || '').trim().startsWith('$2');

export const hashLegacyPassword = (password: string) => createHash('sha256').update(password).digest('hex');

export const hashLocalPassword = async (password: string) => hash(password, normalizeRounds(process.env.BCRYPT_ROUNDS));

export const verifyLocalPassword = async (password: string, passwordHash?: string | null) => {
  const storedHash = String(passwordHash || '').trim();
  if (!storedHash) {
    return {
      valid: false,
      needsUpgrade: false,
    };
  }

  if (isBcryptHash(storedHash)) {
    return {
      valid: await compare(password, storedHash),
      needsUpgrade: false,
    };
  }

  return {
    valid: hashLegacyPassword(password) === storedHash,
    needsUpgrade: true,
  };
};
