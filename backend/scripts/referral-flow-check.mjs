import 'dotenv/config';
import {
  API_BASE,
  pollUntil,
  requestJson,
  saveReport,
  settleOrder,
  uniqueEmail,
  uniquePhone,
} from './shared.mjs';

const ADMIN_EMAIL = process.env.SEED_SUPERADMIN_EMAIL || 'admin@newme.id';
const ADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD || 'ChangeMeNow123!';

function getFrontendBaseUrl() {
  const fallbackOrigin = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .find(Boolean);
  return String(process.env.FRONTEND_URL || fallbackOrigin || 'http://localhost:5173').replace(/\/+$/, '');
}

function summarize(response) {
  return {
    ok: response.ok,
    status: response.status,
    data: response.data,
    body: response.body,
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

async function ensureQuestions() {
  await requestJson('/questions/seed-questions', { method: 'POST', body: {} });
  const questions = await requestJson('/questions');
  const all = questions.data || [];
  return {
    free: all.filter((item) => item.isFree === true),
    paid: all.filter((item) => item.isFree === false),
  };
}

async function requestRedirect(route) {
  const response = await fetch(`${API_BASE}${route}`, {
    method: 'GET',
    redirect: 'manual',
  });

  return {
    status: response.status,
    location: response.headers.get('location'),
  };
}

async function main() {
  const stamp = Date.now();
  const frontendBaseUrl = getFrontendBaseUrl();
  const report = {
    generatedAt: new Date().toISOString(),
    frontendBaseUrl,
    healthBefore: null,
    healthAfter: null,
    redirects: {},
    flow: {},
  };

  report.healthBefore = await requestJson('/health');
  requireOk('health before', report.healthBefore);

  const adminLogin = await requestJson('/admin/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  requireOk('admin login', adminLogin);
  const adminToken = adminLogin.data.token;
  const questions = await ensureQuestions();
  requireCondition(questions.paid.length > 0, 'Referral flow check membutuhkan minimal 1 pertanyaan premium.');
  const paidAnswers = Object.fromEntries(questions.paid.map((item) => [item._id, 1]));

  const mitraRegister = await requestJson('/mitra/register', {
    method: 'POST',
    body: {
      email: uniqueEmail('flow-mitra', stamp, 1),
      fullName: 'Flow Mitra',
      password: 'Password123!',
      phone: uniquePhone('0827', stamp, 1),
    },
  });
  requireOk('mitra register', mitraRegister);
  const mitraUser = mitraRegister.data.mitra;
  const mitraToken = mitraRegister.data.token;

  const mitraVerify = await requestJson(`/mitra/admin/${mitraUser._id}/verify`, {
    method: 'PUT',
    token: adminToken,
    body: {},
  });
  requireOk('mitra verify', mitraVerify);

  const mitraMe = await requestJson('/mitra/me', { token: mitraToken });
  requireOk('mitra me', mitraMe);
  const inviteCode = mitraMe.data.inviteCode;
  requireCondition(!!inviteCode, 'Invite code mitra tidak tersedia.');

  const expectedYayasanRedirect = `${frontendBaseUrl}/yayasan/register?mitra=${encodeURIComponent(inviteCode)}`;
  const yayasanRedirect = await requestRedirect(`/yayasan/register?mitra=${encodeURIComponent(inviteCode)}`);
  requireCondition(
    yayasanRedirect.status >= 300 && yayasanRedirect.status < 400,
    `GET /api/yayasan/register tidak mengembalikan redirect. Status: ${yayasanRedirect.status}`,
  );
  requireCondition(
    yayasanRedirect.location === expectedYayasanRedirect,
    `Redirect yayasan salah. Expected ${expectedYayasanRedirect}, got ${yayasanRedirect.location}`,
  );
  report.redirects.yayasanRegister = yayasanRedirect;

  const yayasanRegister = await requestJson('/yayasan/register', {
    method: 'POST',
    body: {
      email: uniqueEmail('flow-yayasan', stamp, 1),
      fullName: 'Flow Yayasan',
      institutionName: 'Flow Yayasan',
      password: 'Password123!',
      phone: uniquePhone('0837', stamp, 1),
      referralCode: inviteCode,
      referralPrice: 100000,
      institutionAddress: 'Jl. Flow Yayasan',
      description: 'Yayasan flow smoke test',
    },
  });
  requireOk('yayasan register', yayasanRegister);
  const yayasanUser = yayasanRegister.data.yayasan;
  const yayasanToken = yayasanRegister.data.token;

  const yayasanMe = await requestJson('/yayasan/me', { token: yayasanToken });
  requireOk('yayasan me', yayasanMe);
  requireCondition(
    yayasanMe.data.referredByCode === inviteCode,
    `Yayasan referredByCode mismatch. Expected ${inviteCode}, got ${yayasanMe.data.referredByCode}`,
  );
  requireCondition(
    yayasanMe.data.mitraName === mitraMe.data.name || yayasanMe.data.mitraName === mitraMe.data.fullName,
    'Dashboard yayasan belum mengembalikan nama mitra pengundang.',
  );
  requireCondition(
    yayasanMe.data.approvalStatus === 'PENDING_MITRA_APPROVAL',
    `Status approval awal yayasan salah. Expected PENDING_MITRA_APPROVAL, got ${yayasanMe.data.approvalStatus}`,
  );
  requireCondition(
    yayasanMe.data.referralActive === false,
    'Referral yayasan seharusnya belum aktif sebelum approval mitra.',
  );
  requireCondition(
    Number(yayasanMe.data.referralPrice || 0) === 0,
    'Komisi yayasan seharusnya masih kosong sebelum approval mitra.',
  );

  const yayasanReferralCode = yayasanMe.data.referralCode;
  requireCondition(!!yayasanReferralCode, 'Kode referral yayasan tidak tersedia.');

  const expectedUserRedirect = `${frontendBaseUrl}/register?ref=${encodeURIComponent(yayasanReferralCode)}`;
  const userRedirect = await requestRedirect(`/auth/register?ref=${encodeURIComponent(yayasanReferralCode)}`);
  requireCondition(
    userRedirect.status >= 300 && userRedirect.status < 400,
    `GET /api/auth/register tidak mengembalikan redirect. Status: ${userRedirect.status}`,
  );
  requireCondition(
    userRedirect.location === expectedUserRedirect,
    `Redirect user salah. Expected ${expectedUserRedirect}, got ${userRedirect.location}`,
  );
  report.redirects.userRegister = userRedirect;

  const testPrice = await requestJson(`/user-payments/test-price?referralCode=${encodeURIComponent(yayasanReferralCode)}`);
  requireOk('yayasan referral pricing', testPrice);
  requireCondition(testPrice.data.referrerRole === 'YAYASAN', 'Referral pricing tidak mengenali kode yayasan.');
  requireCondition(testPrice.data.referralActive === false, 'Referral yayasan seharusnya belum aktif sebelum approval.');
  requireCondition(
    Number(testPrice.data.totalPrice || 0) === Number(testPrice.data.basePrice || 0),
    'Harga yayasan sebelum approval seharusnya masih sama dengan harga dasar.',
  );

  const preApproveUserRegister = await requestJson('/auth/register', {
    method: 'POST',
    body: {
      email: uniqueEmail('preapprove-user', stamp, 1),
      fullName: 'Preapprove User Yayasan',
      password: 'Password123!',
      phone: uniquePhone('0846', stamp, 1),
      referralCode: yayasanReferralCode,
      address: 'Jl. Preapprove User',
      referralSource: 'yayasan',
    },
  });
  requireCondition(
    !preApproveUserRegister.ok && preApproveUserRegister.status === 400,
    'Registrasi user dengan referral yayasan sebelum approval seharusnya ditolak.',
  );

  const approveYayasan = await requestJson(`/mitra/yayasan/${yayasanUser._id}/approve`, {
    method: 'POST',
    token: mitraToken,
    body: {
      yayasanShare: 50000,
    },
  });
  requireOk('approve yayasan', approveYayasan);
  requireCondition(
    Number(approveYayasan.data.yayasanShare || 0) === 50000,
    'Komisi yayasan setelah approval tidak sesuai nominal yang diatur mitra.',
  );
  requireCondition(
    Number(approveYayasan.data.mitraShare || 0) === 100000,
    'Komisi mitra setelah approval tidak sesuai sisa budget referral.',
  );

  const yayasanMeAfterApproval = await requestJson('/yayasan/me', { token: yayasanToken });
  requireOk('yayasan me after approval', yayasanMeAfterApproval);
  requireCondition(
    yayasanMeAfterApproval.data.approvalStatus === 'APPROVED',
    `Status approval yayasan setelah approve salah. Got ${yayasanMeAfterApproval.data.approvalStatus}`,
  );
  requireCondition(yayasanMeAfterApproval.data.referralActive === true, 'Referral yayasan belum aktif setelah approval.');
  requireCondition(
    Number(yayasanMeAfterApproval.data.referralPrice || 0) === 50000,
    'Komisi yayasan belum tampil benar setelah approval.',
  );

  const testPriceAfterApproval = await requestJson(`/user-payments/test-price?referralCode=${encodeURIComponent(yayasanReferralCode)}`);
  requireOk('yayasan referral pricing after approval', testPriceAfterApproval);
  requireCondition(testPriceAfterApproval.data.referrerRole === 'YAYASAN', 'Referral pricing setelah approval tidak mengenali kode yayasan.');
  requireCondition(testPriceAfterApproval.data.referralActive === true, 'Referral yayasan belum aktif pada endpoint pricing setelah approval.');
  requireCondition(
    Number(testPriceAfterApproval.data.totalPrice || 0) > Number(testPriceAfterApproval.data.basePrice || 0),
    'Harga referral yayasan belum aktif setelah approval.',
  );
  requireCondition(
    Number(testPriceAfterApproval.data.yayasanShare || 0) === 50000 && Number(testPriceAfterApproval.data.mitraShare || 0) === 100000,
    'Split pricing setelah approval tidak sinkron dengan komisi yang diset mitra.',
  );

  const referredUserRegister = await requestJson('/auth/register', {
    method: 'POST',
    body: {
      email: uniqueEmail('flow-user', stamp, 1),
      fullName: 'Flow User Yayasan',
      password: 'Password123!',
      phone: uniquePhone('0847', stamp, 1),
      referralCode: yayasanReferralCode,
      address: 'Jl. Flow User',
      referralSource: 'yayasan',
    },
  });
  requireOk('yayasan referred user register', referredUserRegister);
  const referredUser = referredUserRegister.data.user;
  const referredUserToken = referredUserRegister.data.token;

  const referredUserProfile = await requestJson('/auth/me', { token: referredUserToken });
  requireOk('referred user profile', referredUserProfile);
  requireCondition(referredUserProfile.data.userType === 'institution', 'User referral yayasan belum tersimpan sebagai institution.');
  requireCondition(referredUserProfile.data.isYayasanLinked === true, 'User referral yayasan belum ditandai sebagai yayasan-linked.');
  requireCondition(
    referredUserProfile.data.yayasanReferralCode === yayasanReferralCode,
    'User profile belum memuat kode referral yayasan yang benar.',
  );
  requireCondition(!!referredUserProfile.data.yayasanName, 'User profile belum memuat nama yayasan.');
  requireCondition(!!referredUserProfile.data.mitraName, 'User profile belum memuat nama mitra induk.');

  const yayasanUsersAfterRegister = await requestJson('/yayasan/users', { token: yayasanToken });
  requireOk('yayasan users after register', yayasanUsersAfterRegister);
  requireCondition(
    (yayasanUsersAfterRegister.data || []).some((item) => item._id === referredUser._id && item.paymentStatus === 'unpaid'),
    'User baru belum muncul di dashboard yayasan sebagai registered belum bayar.',
  );

  const yayasanStatsAfterRegister = await requestJson('/yayasan/dashboard/stats', { token: yayasanToken });
  requireOk('yayasan stats after register', yayasanStatsAfterRegister);
  requireCondition(Number(yayasanStatsAfterRegister.data.totalUsers || 0) >= 1, 'Total user yayasan belum bertambah setelah register.');

  const mitraStatsAfterRegister = await requestJson('/mitra/dashboard/stats', { token: mitraToken });
  requireOk('mitra stats after register', mitraStatsAfterRegister);
  requireCondition(Number(mitraStatsAfterRegister.data.totalYayasan || 0) >= 1, 'Total yayasan mitra belum bertambah setelah register yayasan.');
  requireCondition(Number(mitraStatsAfterRegister.data.totalUsers || 0) >= 1, 'Total user mitra belum bertambah setelah register user yayasan.');

  const mitraYayasanListAfterRegister = await requestJson('/mitra/yayasan', { token: mitraToken });
  requireOk('mitra yayasan list after register', mitraYayasanListAfterRegister);
  const managedYayasan = (mitraYayasanListAfterRegister.data || []).find((item) => item._id === yayasanUser._id);
  requireCondition(!!managedYayasan, 'Yayasan baru belum muncul di dashboard mitra.');
  requireCondition(Number(managedYayasan.usersCount || 0) >= 1, 'Jumlah user pada yayasan di dashboard mitra belum bertambah.');

  const snap = await requestJson('/user-payments/create-snap', {
    method: 'POST',
    token: referredUserToken,
    body: {},
  });
  requireOk('create snap', snap);
  const snapData = snap.data?.data || snap.data;
  requireCondition(!!snapData?.orderId, `Snap response tidak lengkap: ${JSON.stringify(snap.data)}`);
  await settleOrder(snapData.orderId, snapData.amount);
  const snapStatus = await pollUntil(`/user-payments/check-payment/${snapData.orderId}`, (response) => {
    return ['settlement', 'capture', 'success'].includes(String(response.data?.status || '').toLowerCase());
  }, { token: referredUserToken });
  requireCondition(['settlement', 'capture', 'success'].includes(String(snapStatus.data?.status || '').toLowerCase()), 'Pembayaran referral yayasan belum settle.');

  const referredUserProfileAfterPayment = await pollUntil('/auth/me', (response) => {
    return response.data?.paymentStatus === 'approved';
  }, { token: referredUserToken, attempts: 25, waitMs: 400 });
  requireCondition(referredUserProfileAfterPayment.data?.paymentStatus === 'approved', 'Status pembayaran user belum approved setelah settle.');

  const yayasanStatsAfterPayment = await requestJson('/yayasan/dashboard/stats', { token: yayasanToken });
  requireOk('yayasan stats after payment', yayasanStatsAfterPayment);
  requireCondition(Number(yayasanStatsAfterPayment.data.paidUsers || 0) >= 1, 'Dashboard yayasan belum mencatat user sebagai sudah bayar.');

  const yayasanWalletAfterPayment = await requestJson('/yayasan/wallet', { token: yayasanToken });
  requireOk('yayasan wallet after payment', yayasanWalletAfterPayment);
  requireCondition(Number(yayasanWalletAfterPayment.data.totalCommission || yayasanWalletAfterPayment.data.balance || 0) > 0, 'Wallet yayasan belum bertambah setelah payment.');

  const mitraWalletAfterPayment = await requestJson('/mitra/wallet', { token: mitraToken });
  requireOk('mitra wallet after payment', mitraWalletAfterPayment);
  requireCondition(Number(mitraWalletAfterPayment.data.totalRevenue || mitraWalletAfterPayment.data.balance || 0) > 0, 'Wallet mitra belum bertambah setelah payment.');

  const paidSubmit = await requestJson('/test-results', {
    method: 'POST',
    token: referredUserToken,
    body: {
      userId: referredUser._id,
      testType: 'paid',
      category: 'general',
      answers: paidAnswers,
    },
  });
  requireOk('paid test submit', paidSubmit);

  const referredUserProfileAfterTest = await pollUntil('/auth/me', (response) => {
    return response.data?.paidTestStatus === 'completed';
  }, { token: referredUserToken, attempts: 15, waitMs: 300 });
  requireCondition(referredUserProfileAfterTest.data?.paidTestStatus === 'completed', 'Status test user belum completed setelah submit paid test.');

  const yayasanStatsAfterTest = await requestJson('/yayasan/dashboard/stats', { token: yayasanToken });
  requireOk('yayasan stats after test', yayasanStatsAfterTest);
  requireCondition(Number(yayasanStatsAfterTest.data.completedTests || 0) >= 1, 'Dashboard yayasan belum mencatat test selesai.');

  const yayasanTestResults = await requestJson('/yayasan/test-results', { token: yayasanToken });
  requireOk('yayasan test results', yayasanTestResults);
  requireCondition((yayasanTestResults.data || []).some((item) => item.userId === referredUser._id), 'Hasil test user belum muncul di dashboard yayasan.');

  report.flow = {
    mitra: {
      register: summarize(mitraRegister),
      me: summarize(mitraMe),
      approveYayasan: summarize(approveYayasan),
      statsAfterRegister: summarize(mitraStatsAfterRegister),
      yayasanListAfterRegister: summarize(mitraYayasanListAfterRegister),
      walletAfterPayment: summarize(mitraWalletAfterPayment),
    },
    yayasan: {
      register: summarize(yayasanRegister),
      me: summarize(yayasanMe),
      meAfterApproval: summarize(yayasanMeAfterApproval),
      pricingBeforeApproval: summarize(testPrice),
      pricingAfterApproval: summarize(testPriceAfterApproval),
      usersAfterRegister: summarize(yayasanUsersAfterRegister),
      statsAfterRegister: summarize(yayasanStatsAfterRegister),
      statsAfterPayment: summarize(yayasanStatsAfterPayment),
      statsAfterTest: summarize(yayasanStatsAfterTest),
      walletAfterPayment: summarize(yayasanWalletAfterPayment),
      testResults: summarize(yayasanTestResults),
    },
    referredUser: {
      registerBeforeApproval: summarize(preApproveUserRegister),
      register: summarize(referredUserRegister),
      profileAfterRegister: summarize(referredUserProfile),
      snap: summarize(snap),
      snapStatus: summarize(snapStatus),
      profileAfterPayment: summarize(referredUserProfileAfterPayment),
      paidSubmit: summarize(paidSubmit),
      profileAfterTest: summarize(referredUserProfileAfterTest),
    },
  };

  report.healthAfter = await requestJson('/health');
  requireOk('health after', report.healthAfter);

  const outputPath = saveReport('referral-flow-report.json', report);
  console.log(JSON.stringify({ outputPath, report }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
