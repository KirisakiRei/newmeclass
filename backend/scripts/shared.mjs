import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendRoot, '..');

export const API_PREFIX = process.env.API_PREFIX || 'api';
export const APP_URL = process.env.APP_URL || 'http://localhost:5000';
export const API_BASE = `${APP_URL.replace(/\/$/, '')}/${API_PREFIX}`;
export const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || 'replace_midtrans_server_key';

export function unwrap(payload) {
  return payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
}

export function extractItems(payload) {
  const data = unwrap(payload);
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray(data.items)) {
    return data.items;
  }
  return [];
}

export async function requestJson(route, { method = 'GET', token, body, headers } = {}) {
  const started = performance.now();
  const response = await fetch(`${API_BASE}${route}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const durationMs = performance.now() - started;
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    durationMs,
    body: payload,
    data: unwrap(payload),
    headers: Object.fromEntries(response.headers.entries()),
  };
}

export async function requestBuffer(route, { method = 'GET', token, headers } = {}) {
  const started = performance.now();
  const response = await fetch(`${API_BASE}${route}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
  });
  const durationMs = performance.now() - started;
  const buffer = Buffer.from(await response.arrayBuffer());
  return {
    ok: response.ok,
    status: response.status,
    durationMs,
    buffer,
    headers: Object.fromEntries(response.headers.entries()),
  };
}

export function signMidtrans(orderId, amount) {
  return crypto.createHash('sha512').update(`${orderId}200${amount}${MIDTRANS_SERVER_KEY}`).digest('hex');
}

export async function settleOrder(orderId, amount) {
  return requestJson('/payments/midtrans/webhook', {
    method: 'POST',
    body: {
      order_id: orderId,
      status_code: '200',
      gross_amount: String(amount),
      transaction_status: 'settlement',
      fraud_status: 'accept',
      signature_key: signMidtrans(orderId, amount),
    },
  });
}

export async function pollUntil(route, isDone, { token, attempts = 20, waitMs = 300 } = {}) {
  let last = null;
  for (let i = 0; i < attempts; i += 1) {
    last = await requestJson(route, { token });
    if (isDone(last)) {
      return last;
    }
    await sleep(waitMs);
  }
  return last;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ensureReportsDir() {
  const reportsDir = path.join(repoRoot, '.dev-artifacts', 'backend', 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  return reportsDir;
}

export function saveReport(fileName, content, asJson = true) {
  const reportsDir = ensureReportsDir();
  const target = path.join(reportsDir, fileName);
  fs.writeFileSync(target, asJson ? `${JSON.stringify(content, null, 2)}\n` : content);
  return target;
}

export function sampleStats(results) {
  const durations = results.map((item) => item.durationMs).sort((a, b) => a - b);
  const total = durations.length;
  const success = results.filter((item) => item.ok).length;
  const errors = results.filter((item) => !item.ok).length;
  const sum = durations.reduce((acc, value) => acc + value, 0);
  const percentile = (p) => (total ? durations[Math.min(total - 1, Math.floor(total * p))] : 0);

  return {
    total,
    success,
    errors,
    minMs: total ? Number(durations[0].toFixed(2)) : 0,
    avgMs: total ? Number((sum / total).toFixed(2)) : 0,
    p95Ms: total ? Number(percentile(0.95).toFixed(2)) : 0,
    maxMs: total ? Number(durations[total - 1].toFixed(2)) : 0,
    statusCounts: results.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}),
  };
}

export function uniqueEmail(prefix, stamp, index) {
  return `${prefix}.${stamp}.${index}@example.com`;
}

export function uniquePhone(prefix, stamp, index) {
  return `${prefix}${String(stamp).slice(-6)}${String(index).padStart(2, '0')}`;
}

export function getRepoRoot() {
  return repoRoot;
}
