import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  completeOtpRegistration,
  extractAccessToken,
  extractAuthSubject,
  extractItems,
  requestJson,
  saveReport,
  uniqueEmail,
  uniquePhone,
} from './shared.mjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_SUPERADMIN_EMAIL || 'admin@newme.id';
const ADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD || 'ChangeMeNow123!';
const DEFAULT_PASSWORD = 'Password123!';

function summarize(response) {
  return {
    ok: response?.ok,
    status: response?.status,
    data: response?.data,
    body: response?.body,
  };
}

function requireOk(label, response) {
  if (!response?.ok) {
    throw new Error(`${label} failed with status ${response?.status}: ${JSON.stringify(response?.body)}`);
  }
  return response;
}

function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function ensureLogamTemplate() {
  const existing = await prisma.personalityResultTemplate.findFirst({
    where: { element: 'logam' },
    orderBy: { updatedAt: 'desc' },
  });

  if (existing) {
    return existing;
  }

  return prisma.personalityResultTemplate.create({
    data: {
      code: 'SMOKE_LOGAM',
      socialType: 'introvert',
      element: 'logam',
      label: 'Si Tegas',
      color: '#9E9E9E',
      aiAnalysis: {
        personalityType: 'Si Tegas',
        summary: 'Dominan LOGAM dengan karakter tegas, objektif, dan terstruktur.',
        strengths: ['Tegas', 'Objektif', 'Terstruktur'],
        areasToImprove: ['Lebih lentur', 'Lebih ekspresif'],
        careerRecommendations: ['Analis', 'Auditor', 'Quality Control'],
        elementScores: {
          KAYU: { label: 'Si Kreatif' },
          API: { label: 'Si Perasa' },
          TANAH: { label: 'Si Stabil' },
          LOGAM: { label: 'Si Tegas' },
          AIR: { label: 'Si Adaptif' },
        },
      },
      insights: {
        code: 'SMOKE_LOGAM',
        personalityLabel: 'Si Tegas',
        karakter: ['Disiplin', 'Rapi', 'Konsisten'],
        dibutuhkanPadaProfesi: 'Karakter ini cocok untuk peran yang membutuhkan akurasi dan konsistensi.',
        kompilasiAdaptasi: {
          fleksibilitas: 'Latih diri untuk lebih terbuka terhadap pendekatan baru.',
        },
      },
    },
  });
}

async function seedPremiumLogamResult(userId, template) {
  const orderId = `SYNC-${Date.now()}`;
  const paidAt = new Date();

  await prisma.user.update({
    where: { id: userId },
    data: {
      paymentStatus: 'SETTLEMENT',
      paidTestStatus: 'COMPLETED',
    },
  });

  await prisma.paymentOrder.create({
    data: {
      orderId,
      userId,
      paymentType: 'TEST_PAYMENT',
      amount: 250000,
      status: 'SETTLEMENT',
      paidAt,
      paymentUrl: `https://app.sandbox.midtrans.com/snap/v2/vtweb/${orderId}`,
      metadata: {
        source: 'check-premium-sync',
      },
      events: {
        create: {
          fromStatus: 'PENDING',
          toStatus: 'SETTLEMENT',
          source: 'check-premium-sync',
          payload: {
            orderId,
            status: 'settlement',
          },
        },
      },
    },
  });

  return prisma.testResult.create({
    data: {
      userId,
      testType: 'paid',
      category: 'general',
      scoringVersion: 1,
      personalityCode: template.code,
      dominantElement: 'LOGAM',
      socialType: template.socialType,
      elementScores: {
        KAYU: 1,
        API: 1,
        TANAH: 2,
        LOGAM: 4,
        AIR: 2,
      },
      normalizedScores: {
        KAYU: 10,
        API: 12,
        TANAH: 18,
        LOGAM: 44,
        AIR: 16,
      },
      freeTeaser: {
        code: template.code,
        personalityLabel: template.label,
      },
      paidInsights: Prisma.JsonNull,
      aiInsights: Prisma.JsonNull,
    },
  });
}

function assertStandardResult(label, payload, expected) {
  requireCondition(payload && typeof payload === 'object', `${label}: payload tidak valid.`);
  requireCondition(payload.id === expected.resultId, `${label}: id hasil tidak cocok.`);
  requireCondition(payload.resultId === expected.resultId, `${label}: resultId tidak cocok.`);
  requireCondition(payload.userId === expected.userId, `${label}: userId tidak cocok.`);
  requireCondition(payload.testType === 'paid', `${label}: testType harus paid.`);
  requireCondition(payload.dominantElement === 'LOGAM', `${label}: dominantElement harus LOGAM.`);
  requireCondition(payload.personalityCode === expected.personalityCode, `${label}: personalityCode tidak sinkron.`);
  requireCondition(payload.personalityType === expected.personalityType, `${label}: personalityType top-level tidak sinkron.`);
  requireCondition(payload.dominantLabel && typeof payload.dominantLabel === 'string', `${label}: dominantLabel kosong.`);
  requireCondition(payload.userName === 'vvaa', `${label}: userName harus vvaa.`);
  requireCondition(payload.userEmail === expected.userEmail, `${label}: userEmail tidak sinkron.`);
  requireCondition(payload.userProvince === 'DKI Jakarta', `${label}: userProvince tidak sinkron.`);
  requireCondition(payload.userCity === 'Jakarta Selatan', `${label}: userCity tidak sinkron.`);
  requireCondition(payload.displayAnalysis?.personalityType === expected.personalityType, `${label}: displayAnalysis.personalityType tidak sinkron.`);
  requireCondition(typeof payload.displayAnalysis?.summary === 'string' && payload.displayAnalysis.summary.length > 0, `${label}: summary kosong.`);
  requireCondition(payload.displayAnalysis?.elementScores?.LOGAM?.percentage === 44, `${label}: displayAnalysis LOGAM harus 44%.`);
  requireCondition(Array.isArray(payload.displayAnalysis?.strengths), `${label}: strengths bukan array.`);
  requireCondition(Array.isArray(payload.displayAnalysis?.areasToImprove), `${label}: areasToImprove bukan array.`);
  requireCondition(Array.isArray(payload.displayAnalysis?.careerRecommendations), `${label}: careerRecommendations bukan array.`);
  requireCondition(payload.analysis?.dominantElement === 'LOGAM', `${label}: analysis.dominantElement harus LOGAM.`);
  requireCondition(payload.analysis?.personalityType === expected.personalityType, `${label}: analysis.personalityType tidak sinkron.`);
  requireCondition(payload.analysis?.elementScores?.LOGAM?.percentage === 44, `${label}: analysis.elementScores.LOGAM harus 44%.`);
  requireCondition(payload.analysis?.insights?.code === expected.personalityCode, `${label}: analysis.insights.code tidak sinkron.`);
  requireCondition(
    payload.analysis?.insights?.personalityLabel === expected.personalityLabel,
    `${label}: analysis.insights.personalityLabel tidak sinkron.`,
  );
  requireCondition(
    payload.analysis?.aiInsights && typeof payload.analysis.aiInsights === 'object' && Object.keys(payload.analysis.aiInsights).length > 0,
    `${label}: analysis.aiInsights fallback tidak terbentuk.`,
  );
}

async function main() {
  const stamp = Date.now();
  const template = await ensureLogamTemplate();
  const expectedPersonalityType =
    template.aiAnalysis?.personalityType
    || template.insights?.personalityLabel
    || template.label;

  const report = {
    generatedAt: new Date().toISOString(),
    template: {
      id: template.id,
      code: template.code,
      label: template.label,
      socialType: template.socialType,
      personalityType: expectedPersonalityType,
    },
    payloads: {},
  };

  const adminLogin = await requestJson('/admin/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  requireOk('admin login', adminLogin);
  const adminToken = extractAccessToken(adminLogin);

  const mitraRegister = await requestJson('/mitra/register', {
    method: 'POST',
    body: {
      email: uniqueEmail('sync-mitra', stamp, 1),
      fullName: 'Sync Mitra',
      password: DEFAULT_PASSWORD,
      phone: uniquePhone('0827', stamp, 1),
    },
  });
  requireOk('mitra register', mitraRegister);
  const mitraUser = extractAuthSubject(mitraRegister, 'mitra');
  const mitraToken = extractAccessToken(mitraRegister);

  const mitraVerify = await requestJson(`/mitra/admin/${mitraUser._id || mitraUser.id}/verify`, {
    method: 'PUT',
    token: adminToken,
    body: {},
  });
  requireOk('mitra verify', mitraVerify);

  const mitraMe = await requestJson('/mitra/me', { token: mitraToken });
  requireOk('mitra me', mitraMe);
  const inviteCode = mitraMe.data.inviteCode;
  requireCondition(!!inviteCode, 'Invite code mitra tidak tersedia.');

  const yayasanRegistration = await completeOtpRegistration('/yayasan', {
    startBody: {
      email: uniqueEmail('sync-yayasan', stamp, 1),
      fullName: 'Sync Yayasan',
      password: DEFAULT_PASSWORD,
      referralCode: inviteCode,
    },
    completeBody: {
      phone: uniquePhone('0837', stamp, 1),
      referralCode: inviteCode,
      address: 'Jl. Sinkron Yayasan',
      description: 'Yayasan untuk validasi hasil premium',
    },
  });
  requireOk('yayasan register start', yayasanRegistration.start);
  requireOk('yayasan register verify', yayasanRegistration.verify);
  requireOk('yayasan register complete', yayasanRegistration.complete);
  const yayasanRegister = yayasanRegistration.complete;
  const yayasanUser = extractAuthSubject(yayasanRegister, 'yayasan');
  const yayasanToken = extractAccessToken(yayasanRegister);

  const approveYayasan = await requestJson(`/mitra/yayasan/${yayasanUser._id || yayasanUser.id}/approve`, {
    method: 'POST',
    token: mitraToken,
    body: {
      yayasanShare: 50000,
    },
  });
  requireOk('approve yayasan', approveYayasan);

  const yayasanMe = await requestJson('/yayasan/me', { token: yayasanToken });
  requireOk('yayasan me', yayasanMe);
  const yayasanReferralCode = yayasanMe.data.referralCode;
  requireCondition(!!yayasanReferralCode, 'Referral code yayasan tidak tersedia.');

  const userRegistration = await completeOtpRegistration('/auth', {
    startBody: {
      email: uniqueEmail('sync-user', stamp, 1),
      fullName: 'vvaa',
      password: DEFAULT_PASSWORD,
      referralCode: yayasanReferralCode,
    },
    completeBody: {
      phone: uniquePhone('0847', stamp, 1),
      whatsapp: uniquePhone('0847', stamp, 1),
      referralCode: yayasanReferralCode,
      referralSource: 'yayasan',
      address: 'Jl. Sinkron User',
    },
  });
  requireOk('user register start', userRegistration.start);
  requireOk('user register verify', userRegistration.verify);
  requireOk('user register complete', userRegistration.complete);
  const userRegister = userRegistration.complete;
  const testUser = extractAuthSubject(userRegister, 'user');
  const userToken = extractAccessToken(userRegister);

  await prisma.userProfile.upsert({
    where: { userId: testUser._id || testUser.id },
    create: {
      userId: testUser._id || testUser.id,
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      extra: {
        whatsapp: testUser.phone,
      },
    },
    update: {
      province: 'DKI Jakarta',
      city: 'Jakarta Selatan',
      extra: {
        whatsapp: testUser.phone,
      },
    },
  });

  const createdResult = await seedPremiumLogamResult(testUser._id || testUser.id, template);

  const expected = {
    resultId: createdResult.id,
    userId: testUser._id || testUser.id,
    userEmail: testUser.email,
    personalityCode: template.code,
    personalityLabel: template.insights?.personalityLabel || template.label,
    personalityType: expectedPersonalityType,
  };

  const userResult = await requestJson(`/test-results/${createdResult.id}`, { token: userToken });
  requireOk('user result detail', userResult);
  assertStandardResult('user result detail', userResult.data, expected);

  const latestAi = await requestJson('/ai-analysis/latest', { token: userToken });
  requireOk('user latest ai analysis', latestAi);
  requireCondition(latestAi.data?.success === true, 'ai-analysis/latest harus success=true.');
  assertStandardResult('user latest ai analysis', latestAi.data.analysis, expected);

  const adminPremiumList = await requestJson('/test-results/admin/premium-results', { token: adminToken });
  requireOk('admin premium list', adminPremiumList);
  const adminPremiumItems = extractItems(adminPremiumList.body);
  requireCondition(Array.isArray(adminPremiumItems), 'admin premium list harus berupa array.');
  const adminListItem = adminPremiumItems.find((item) => item.userId === testUser._id);
  requireCondition(!!adminListItem, 'User hasil premium tidak ditemukan di admin premium list.');
  assertStandardResult('admin premium list item', adminListItem, expected);

  const adminPremiumDetail = await requestJson(`/test-results/admin/premium-results/${testUser._id}`, { token: adminToken });
  requireOk('admin premium detail', adminPremiumDetail);
  requireCondition(!Array.isArray(adminPremiumDetail.data), 'admin premium detail harus object tunggal.');
  assertStandardResult('admin premium detail', adminPremiumDetail.data, expected);

  const adminStats = await requestJson('/test-results/admin/stats', { token: adminToken });
  requireOk('admin stats', adminStats);
  requireCondition(typeof adminStats.data?.total === 'number', 'admin stats.total harus number.');
  requireCondition(typeof adminStats.data?.totalPaid === 'number', 'admin stats.totalPaid harus number.');
  requireCondition(typeof adminStats.data?.totalFree === 'number', 'admin stats.totalFree harus number.');
  requireCondition(
    typeof adminStats.data?.premiumResultsThisMonth === 'number',
    'admin stats.premiumResultsThisMonth harus number.',
  );

  const yayasanResults = await requestJson('/yayasan/test-results', { token: yayasanToken });
  requireOk('yayasan test results', yayasanResults);
  const yayasanResultItems = extractItems(yayasanResults.body);
  requireCondition(Array.isArray(yayasanResultItems), 'yayasan test results harus berupa array.');
  const yayasanListItem = yayasanResultItems.find((item) => item.userId === testUser._id);
  requireCondition(!!yayasanListItem, 'User hasil premium tidak ditemukan di yayasan test results.');
  assertStandardResult('yayasan test results item', yayasanListItem, expected);

  const yayasanUserDetail = await requestJson(`/yayasan/users/${testUser._id}/detail`, { token: yayasanToken });
  requireOk('yayasan user detail', yayasanUserDetail);
  requireCondition(yayasanUserDetail.data?.latestResult, 'yayasan user detail.latestResult harus tersedia.');
  assertStandardResult('yayasan latest result', yayasanUserDetail.data.latestResult, expected);

  report.payloads = {
    userResult: summarize(userResult),
    latestAi: summarize(latestAi),
    adminPremiumListItem: adminListItem,
    adminPremiumDetail: summarize(adminPremiumDetail),
    adminStats: summarize(adminStats),
    yayasanListItem,
    yayasanUserDetail: summarize(yayasanUserDetail),
  };

  const outputPath = saveReport('premium-sync-report.json', report);
  console.log(JSON.stringify({ outputPath, report }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
