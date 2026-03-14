import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import {
  requestBuffer,
  requestJson,
  sampleStats,
  saveReport,
  uniqueEmail,
  uniquePhone,
} from './shared.mjs';

const CONCURRENCY = Number(process.env.BENCHMARK_USERS || 100);
const ADMIN_EMAIL = process.env.SEED_SUPERADMIN_EMAIL || 'admin@newme.id';
const ADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD || 'ChangeMeNow123!';
const prisma = new PrismaClient();

function signBenchmarkToken(user) {
  return jwt.sign(
    { sub: user.id, role: 'USER', email: user.email },
    process.env.JWT_ACCESS_SECRET,
  );
}

async function loadBenchmarkUsers(count, stamp) {
  const preferred = await prisma.user.findMany({
    where: {
      role: 'USER',
      email: { startsWith: `bench-user.${stamp}.` },
    },
    orderBy: { createdAt: 'desc' },
    take: count,
    select: { id: true, email: true },
  });

  const rows = preferred.length >= count
    ? preferred
    : await prisma.user.findMany({
        where: {
          role: 'USER',
          email: { startsWith: 'bench-user.' },
        },
        orderBy: { createdAt: 'desc' },
        take: count,
        select: { id: true, email: true },
      });

  return rows.map((user) => ({
    userId: user.id,
    email: user.email,
    token: signBenchmarkToken(user),
  }));
}

async function ensureQuestions() {
  await requestJson('/questions/seed-questions', { method: 'POST', body: {} });
  const questions = await requestJson('/questions');
  const all = questions.data || [];
  return {
    free: all.filter((item) => item.isFree === true),
  };
}

async function registerUsers(count, stamp) {
  const registrations = await Promise.all(
    Array.from({ length: count }, (_, index) => {
      return requestJson('/auth/register', {
        method: 'POST',
        body: {
          email: uniqueEmail('bench-user', stamp, index),
          fullName: `Benchmark User ${index + 1}`,
          password: 'Password123!',
          phone: uniquePhone('0899', stamp, index),
          address: `Jl. Benchmark ${index + 1}`,
        },
      });
    }),
  );

  return registrations.map((item, index) => ({
    email: uniqueEmail('bench-user', stamp, index),
    password: 'Password123!',
    userId: item.data?.user?._id,
    token: item.data?.token,
  }));
}

async function benchmarkLogins(credentials) {
  const results = await Promise.all(credentials.map((item) => {
    return requestJson('/auth/login', {
      method: 'POST',
      body: { email: item.email, password: item.password },
    });
  }));

  return {
    summary: sampleStats(results),
    tokens: results.map((item) => item.data?.token).filter(Boolean),
    users: results.map((item, index) => ({
      userId: item.data?.user?._id || credentials[index].userId,
      token: item.data?.token,
      email: credentials[index].email,
    })),
    rawErrors: results.filter((item) => !item.ok).map((item) => ({ status: item.status, body: item.body })),
  };
}

async function benchmarkExams(users, freeQuestions) {
  const answers = Object.fromEntries(freeQuestions.map((item) => [item._id, 0]));
  const results = await Promise.all(users.map((item) => {
    return requestJson('/test-results', {
      method: 'POST',
      token: item.token,
      body: {
        userId: item.userId,
        testType: 'free',
        category: 'general',
        answers,
      },
    });
  }));

  return {
    summary: sampleStats(results),
    resultIds: results.map((item) => item.data?.resultId).filter(Boolean),
    rawErrors: results.filter((item) => !item.ok).map((item) => ({ status: item.status, body: item.body })),
  };
}

async function issueCertificates(adminToken, users) {
  const issued = await Promise.all(users.map((item, index) => {
    return requestJson('/certificates/issue', {
      method: 'POST',
      token: adminToken,
      body: {
        userId: item.userId,
        certType: 'INDIVIDU',
        courseName: 'Benchmark Certificate',
        userName: `Benchmark User ${index + 1}`,
        userEmail: item.email,
      },
    });
  }));
  return issued.map((item) => item.data?.certificateNumber).filter(Boolean);
}

async function benchmarkDownloads(certificateNumbers) {
  const results = await Promise.all(certificateNumbers.map((certificateNumber) => requestBuffer(`/certificates/download/${certificateNumber}`)));
  return {
    summary: sampleStats(results),
    pdfSuccessCount: results.filter((item) => item.ok && item.headers['content-type'] === 'application/pdf' && item.buffer.subarray(0, 4).toString() === '%PDF').length,
    rawErrors: results.filter((item) => !item.ok).map((item) => ({ status: item.status })),
  };
}

async function benchmarkErrorHandling() {
  const badLoginRequests = Array.from({ length: 30 }, (_, index) => requestJson('/auth/login', {
    method: 'POST',
    body: { email: `missing-${index}@example.com`, password: 'WrongPassword123!' },
  }));
  const missingAuthRequests = Array.from({ length: 35 }, () => requestJson('/auth/me'));
  const invalidCertificateRequests = Array.from({ length: 35 }, (_, index) => requestBuffer(`/certificates/download/INVALID-BENCH-${index}`));
  const results = await Promise.all([...badLoginRequests, ...missingAuthRequests, ...invalidCertificateRequests]);
  return {
    summary: sampleStats(results),
    expectedClientErrors: results.filter((item) => [401, 404].includes(item.status)).length,
    unexpectedStatuses: results.filter((item) => ![401, 404].includes(item.status)).map((item) => item.status),
  };
}

async function run() {
  const stamp = Date.now();
  const report = {
    generatedAt: new Date().toISOString(),
    users: CONCURRENCY,
    healthBefore: await requestJson('/health'),
    stages: {},
    healthAfter: null,
  };

  const adminLogin = await requestJson('/admin/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const adminToken = adminLogin.data.token;

  const questions = await ensureQuestions();
  if (questions.free.length === 0) {
    throw new Error('Benchmark membutuhkan minimal 1 pertanyaan gratis.');
  }

  const credentials = await registerUsers(CONCURRENCY, stamp);
  report.stages.registration = {
    count: credentials.length,
  };

  const loginStage = await benchmarkLogins(credentials);
  report.stages.login = loginStage.summary;

  const fallbackUsers = await loadBenchmarkUsers(CONCURRENCY, stamp);
  const fallbackByEmail = new Map(fallbackUsers.map((item) => [item.email, item]));
  const users = credentials
    .map((item, index) => ({
      userId: loginStage.users[index]?.userId || item.userId || fallbackByEmail.get(item.email)?.userId,
      token: loginStage.users[index]?.token || item.token || fallbackByEmail.get(item.email)?.token,
      email: item.email,
    }))
    .filter((item) => item.userId && item.token);
  if (users.length === 0) {
    users.push(...fallbackUsers);
  }
  const examStage = await benchmarkExams(users, questions.free);
  report.stages.exam = examStage.summary;

  const certificateNumbers = await issueCertificates(adminToken, users);
  report.stages.issueCertificate = {
    requested: users.length,
    issued: certificateNumbers.length,
  };

  const downloadStage = await benchmarkDownloads(certificateNumbers);
  report.stages.downloadCertificate = downloadStage.summary;
  report.stages.downloadCertificate.pdfSuccessCount = downloadStage.pdfSuccessCount;

  const errorStage = await benchmarkErrorHandling();
  report.stages.errorHandling = errorStage.summary;
  report.stages.errorHandling.expectedClientErrors = errorStage.expectedClientErrors;
  report.stages.errorHandling.unexpectedStatuses = errorStage.unexpectedStatuses;

  report.healthAfter = await requestJson('/health');
  report.failures = {
    login: loginStage.rawErrors,
    exam: examStage.rawErrors,
    download: downloadStage.rawErrors,
  };

  const outputPath = saveReport('benchmark-report.json', report);
  console.log(JSON.stringify({ outputPath, report }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
