import { existsSync } from 'fs';
import { mkdir, readFile, rm } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { dirname, resolve } from 'path';

const execFileAsync = promisify(execFile);

const trimTrailingSlash = (value?: string | null) => String(value || '').trim().replace(/\/+$/, '');

const normalizeBaseUrl = (value?: string | null) => {
  const normalized = trimTrailingSlash(value);
  if (!normalized || /your-domain\.tld/i.test(normalized)) {
    return '';
  }
  return normalized;
};

const isRunningInContainer = () => existsSync('/.dockerenv');

const isLoopbackBaseUrl = (value: string) => {
  try {
    const url = new URL(value);
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
};

const resolveDashboardBaseUrls = () => {
  const rawCandidates = [
    normalizeBaseUrl(process.env.DASHBOARD_FRONTEND_URL),
    normalizeBaseUrl(process.env.FRONTEND_URL),
    normalizeBaseUrl(process.env.APP_URL),
    'http://dashboard_frontend',
    'http://127.0.0.1:8080',
  ].filter(Boolean) as string[];

  const candidates: string[] = [];
  const seen = new Set<string>();
  const inContainer = isRunningInContainer();

  const pushCandidate = (value: string) => {
    if (!value || seen.has(value)) {
      return;
    }
    seen.add(value);
    candidates.push(value);
  };

  for (const candidate of rawCandidates) {
    if (inContainer && isLoopbackBaseUrl(candidate)) {
      pushCandidate('http://dashboard_frontend');
      pushCandidate('http://dashboard_frontend:80');
    }
    pushCandidate(candidate);
  }

  return candidates;
};

export async function buildVisualCertificatePdf(certificate: Record<string, any>) {
  const certificateNumber = String(certificate?.certificateNumber || '').trim();
  if (!certificateNumber) {
    throw new Error('Certificate number is required for PDF rendering.');
  }

  const frontendBaseUrls = resolveDashboardBaseUrls();
  if (!frontendBaseUrls.length) {
    throw new Error('Dashboard frontend URL is not configured.');
  }

  let lastError: unknown;
  for (const frontendBaseUrl of frontendBaseUrls) {
    try {
      const pageUrl = `${frontendBaseUrl}/certificate-pdf/${encodeURIComponent(certificateNumber)}`;
      const runnerPath = resolve(process.cwd(), 'dist', 'src', 'common', 'utils', 'certificate-pdf-renderer.js');
      const outputPath = resolve(
        process.cwd(),
        'uploads',
        'certificates',
        'generated',
        `.render-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`,
      );

      await mkdir(dirname(outputPath), { recursive: true });
      await execFileAsync(process.execPath, [runnerPath, pageUrl, outputPath], {
        env: process.env,
        timeout: 120000,
        windowsHide: true,
      });

      try {
        return await readFile(outputPath);
      } finally {
        await rm(outputPath, { force: true }).catch(() => undefined);
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Certificate PDF rendering failed.');
}
