import {
  requestBuffer,
  requestJson,
  settleOrder,
  pollUntil,
  saveReport,
  uniqueEmail,
  uniquePhone,
} from './shared.mjs';

const ADMIN_EMAIL = process.env.SEED_SUPERADMIN_EMAIL || 'admin@newme.id';
const ADMIN_PASSWORD = process.env.SEED_SUPERADMIN_PASSWORD || 'ChangeMeNow123!';

function summarizeResponse(response) {
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

async function ensureQuestions() {
  await requestJson('/questions/seed-questions', { method: 'POST', body: {} });
  const questions = await requestJson('/questions');
  const all = questions.data || [];
  return {
    all,
    free: all.filter((item) => item.isFree === true),
    paid: all.filter((item) => item.isFree === false),
  };
}

async function run() {
  const stamp = Date.now();
  const report = {
    generatedAt: new Date().toISOString(),
    healthBefore: null,
    healthAfter: null,
    manualFlows: {},
  };

  report.healthBefore = await requestJson('/health');

  const adminLogin = await requestJson('/admin/login', {
    method: 'POST',
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  requireOk('admin login', adminLogin);
  const adminToken = adminLogin.data.token;
  const questions = await ensureQuestions();
  const freeAnswers = Object.fromEntries(questions.free.map((item) => [item._id, 0]));
  const paidAnswers = Object.fromEntries(questions.paid.map((item) => [item._id, 1]));

  const individualRegister = await requestJson('/auth/register', {
    method: 'POST',
    body: {
      email: uniqueEmail('individual', stamp, 1),
      fullName: 'Manual Individual User',
      password: 'Password123!',
      phone: uniquePhone('0811', stamp, 1),
      address: 'Jl. Manual Individual 1',
    },
  });
  requireOk('individual register', individualRegister);
  const individualUser = individualRegister.data.user;
  const individualLogin = await requestJson('/auth/login', {
    method: 'POST',
    body: { email: individualUser.email, password: 'Password123!' },
  });
  requireOk('individual login', individualLogin);
  const individualToken = individualLogin.data.token;
  const individualProfile = await requestJson('/auth/me', { token: individualToken });
  const freeSubmit = await requestJson('/test-results', {
    method: 'POST',
    token: individualToken,
    body: { userId: individualUser._id, testType: 'free', category: 'general', answers: freeAnswers },
  });
  const freeAccess = await requestJson('/test-access/check', { token: individualToken });
  const topup = await requestJson('/wallet/topup', {
    method: 'POST',
    token: individualToken,
    body: { amount: 150000 },
  });
  requireOk('individual wallet topup', topup);
  await settleOrder(topup.data.orderId, topup.data.amount);
  const topupStatus = await pollUntil(`/wallet/check-status/${topup.data.orderId}`, (response) => {
    return ['settlement', 'capture', 'success'].includes(response.data.status);
  }, { token: individualToken });
  const walletPay = await requestJson('/wallet/pay-test', {
    method: 'POST',
    token: individualToken,
    body: {
      amount: 100000,
      description: 'Manual flow premium payment',
    },
  });
  const paidSubmit = await requestJson('/test-results', {
    method: 'POST',
    token: individualToken,
    body: { userId: individualUser._id, testType: 'paid', category: 'general', answers: paidAnswers },
  });
  const generatedCertificate = await requestBuffer(`/certificates/generate-newme/${individualUser._id}`);

  report.manualFlows.individualUser = {
    register: individualRegister,
    login: individualLogin,
    profile: individualProfile,
    freeSubmit,
    freeAccess,
    topup,
    topupStatus,
    walletPay,
    paidSubmit,
    generatedCertificate: {
      status: generatedCertificate.status,
      contentType: generatedCertificate.headers['content-type'],
      size: generatedCertificate.buffer.length,
      startsWithPdf: generatedCertificate.buffer.subarray(0, 4).toString(),
    },
  };

  const mitraRegister = await requestJson('/mitra/register', {
    method: 'POST',
    body: {
      email: uniqueEmail('mitra', stamp, 1),
      fullName: 'Manual Mitra',
      password: 'Password123!',
      phone: uniquePhone('0821', stamp, 1),
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
  const mitraMe = await requestJson('/mitra/me', { token: mitraToken });

  const yayasanRegister = await requestJson('/yayasan/register', {
    method: 'POST',
    body: {
      email: uniqueEmail('yayasan', stamp, 1),
      fullName: 'Manual Yayasan',
      institutionName: 'Manual Yayasan',
      password: 'Password123!',
      phone: uniquePhone('0831', stamp, 1),
      referralCode: mitraMe.data.inviteCode,
      referralPrice: 100000,
      institutionAddress: 'Jl. Manual Yayasan',
      description: 'Yayasan untuk smoke test',
    },
  });
  requireOk('yayasan register', yayasanRegister);
  const yayasanUser = yayasanRegister.data.yayasan;
  const yayasanToken = yayasanRegister.data.token;
  const yayasanVerify = await requestJson(`/yayasan/admin/${yayasanUser._id}/verify`, {
    method: 'PUT',
    token: adminToken,
    body: {},
  });
  const mitraSetPrice = await requestJson(`/mitra/yayasan/${yayasanUser._id}/price`, {
    method: 'PUT',
    token: mitraToken,
    body: { yayasanShare: 100000, mitraShare: 50000, totalPrice: 250000 },
  });
  const yayasanMe = await requestJson('/yayasan/me', { token: yayasanToken });

  const referredUserRegister = await requestJson('/auth/register', {
    method: 'POST',
    body: {
      email: uniqueEmail('referred-user', stamp, 1),
      fullName: 'Manual Referred User',
      password: 'Password123!',
      phone: uniquePhone('0841', stamp, 1),
      referralCode: yayasanMe.data.referralCode,
      address: 'Jl. Referral Yayasan 1',
      referralSource: 'yayasan',
    },
  });
  requireOk('yayasan referred user register', referredUserRegister);
  const referredUser = referredUserRegister.data.user;
  const referredToken = referredUserRegister.data.token;
  const referralPrice = await requestJson(`/user-payments/test-price?referralCode=${yayasanMe.data.referralCode}`);
  const qris = await requestJson('/user-payments/create-qris', {
    method: 'POST',
    token: referredToken,
    body: {},
  });
  await settleOrder(qris.data.orderId, qris.data.amount);
  const qrisStatus = await pollUntil(`/user-payments/check-payment/${qris.data.orderId}`, (response) => {
    return ['settlement', 'capture', 'success'].includes(response.data.status);
  }, { token: referredToken });
  const yayasanWalletBeforeWithdraw = await requestJson('/yayasan/wallet', { token: yayasanToken });
  const mitraWalletBeforeWithdraw = await requestJson('/mitra/wallet', { token: mitraToken });
  const yayasanStats = await requestJson('/yayasan/dashboard/stats', { token: yayasanToken });
  const mitraStats = await requestJson('/mitra/dashboard/stats', { token: mitraToken });
  const yayasanUsers = await requestJson('/yayasan/users', { token: yayasanToken });
  const yayasanTests = await requestJson('/yayasan/test-results', { token: yayasanToken });
  const mitraYayasanList = await requestJson('/mitra/yayasan', { token: mitraToken });
  const yayasanWithdraw = await requestJson('/yayasan/wallet/withdraw', {
    method: 'POST',
    token: yayasanToken,
    body: {
      amount: 15000,
      bankName: 'BCA',
      bankAccount: '1234567890',
      accountName: 'Manual Yayasan',
      notes: 'Manual withdrawal yayasan',
    },
  });
  const mitraWithdraw = await requestJson('/mitra/withdraw', {
    method: 'POST',
    token: mitraToken,
    body: {
      amount: 5000,
      bankName: 'BRI',
      bankAccount: '0987654321',
      accountName: 'Manual Mitra',
      notes: 'Manual withdrawal mitra',
    },
  });
  const adminYayasanList = await requestJson('/yayasan/admin/list', { token: adminToken });
  const adminYayasanDetail = await requestJson(`/yayasan/admin/${yayasanUser._id}/detail`, { token: adminToken });
  const adminMitraList = await requestJson('/mitra/admin/list', { token: adminToken });
  const adminMitraDetail = await requestJson(`/mitra/admin/${mitraUser._id}/detail`, { token: adminToken });
  const adminYayasanWithdrawals = await requestJson('/yayasan/admin/withdrawals', { token: adminToken });
  const adminMitraWithdrawals = await requestJson('/mitra/admin/withdrawals', { token: adminToken });
  const approveYayasanWithdraw = await requestJson(`/yayasan/admin/withdrawals/${yayasanWithdraw.data._id}/approve`, {
    method: 'PUT',
    token: adminToken,
    body: { status: 'APPROVED', notes: 'Approved in manual flow' },
  });
  const approveMitraWithdraw = await requestJson(`/mitra/admin/withdrawals/${mitraWithdraw.data._id}/approve`, {
    method: 'PUT',
    token: adminToken,
    body: { status: 'APPROVED', notes: 'Approved in manual flow' },
  });
  const yayasanWalletAfterWithdraw = await requestJson('/yayasan/wallet', { token: yayasanToken });
  const mitraWalletAfterWithdraw = await requestJson('/mitra/wallet', { token: mitraToken });
  const issueCertificate = await requestJson('/certificates/issue', {
    method: 'POST',
    token: adminToken,
    body: {
      userId: referredUser._id,
      certType: 'INDIVIDU',
      courseName: 'NEWME Premium',
      userName: referredUser.name,
      userEmail: referredUser.email,
    },
  });
  const downloadedCertificate = await requestBuffer(`/certificates/download/${issueCertificate.data.certificateNumber}`);

  const userReferrerRegister = await requestJson('/auth/register', {
    method: 'POST',
    body: {
      email: uniqueEmail('user-referrer', stamp, 1),
      fullName: 'Manual User Referrer',
      password: 'Password123!',
      phone: uniquePhone('0851', stamp, 1),
      address: 'Jl. Referral User 1',
    },
  });
  requireOk('user referrer register', userReferrerRegister);
  const userReferrer = userReferrerRegister.data.user;
  const userReferrerToken = userReferrerRegister.data.token;
  const userReferrerProfileBefore = await requestJson('/auth/me', { token: userReferrerToken });

  const userReferralRegister = await requestJson('/auth/register', {
    method: 'POST',
    body: {
      email: uniqueEmail('user-referred', stamp, 1),
      fullName: 'Manual User Referred',
      password: 'Password123!',
      phone: uniquePhone('0861', stamp, 1),
      referralCode: userReferrer.myReferralCode,
      address: 'Jl. Referral User 2',
      referralSource: 'user',
    },
  });
  requireOk('user referred register', userReferralRegister);
  const userReferral = userReferralRegister.data.user;
  const userReferralToken = userReferralRegister.data.token;
  const userReferrerProfileAfterRegister = await requestJson('/auth/me', { token: userReferrerToken });
  const userReferralPrice = await requestJson(`/user-payments/test-price?referralCode=${userReferrer.myReferralCode}`);
  const userReferralQris = await requestJson('/user-payments/create-qris', {
    method: 'POST',
    token: userReferralToken,
    body: {},
  });
  requireOk('user referral qris', userReferralQris);
  await settleOrder(userReferralQris.data.orderId, userReferralQris.data.amount);
  const userReferralQrisStatus = await pollUntil(`/user-payments/check-payment/${userReferralQris.data.orderId}`, (response) => {
    return ['settlement', 'capture', 'success'].includes(response.data.status);
  }, { token: userReferralToken });
  const userReferrerProfileAfterPayment = await requestJson('/auth/me', { token: userReferrerToken });

  report.manualFlows.referralChain = {
    mitra: {
      register: mitraRegister,
      verify: mitraVerify,
      me: mitraMe,
      walletBeforeWithdraw: mitraWalletBeforeWithdraw,
      stats: mitraStats,
      yayasanList: summarizeResponse(mitraYayasanList),
      withdraw: mitraWithdraw,
      walletAfterWithdraw: mitraWalletAfterWithdraw,
      adminListCount: Array.isArray(adminMitraList.data) ? adminMitraList.data.length : 0,
      adminDetail: adminMitraDetail,
      adminWithdrawalsCount: Array.isArray(adminMitraWithdrawals.data) ? adminMitraWithdrawals.data.length : 0,
      approveWithdraw: approveMitraWithdraw,
    },
    yayasan: {
      register: yayasanRegister,
      verify: yayasanVerify,
      me: yayasanMe,
      setPrice: mitraSetPrice,
      walletBeforeWithdraw: yayasanWalletBeforeWithdraw,
      walletAfterWithdraw: yayasanWalletAfterWithdraw,
      stats: yayasanStats,
      usersCount: Array.isArray(yayasanUsers.data) ? yayasanUsers.data.length : 0,
      users: summarizeResponse(yayasanUsers),
      testResultsCount: Array.isArray(yayasanTests.data) ? yayasanTests.data.length : 0,
      withdraw: yayasanWithdraw,
      adminListCount: Array.isArray(adminYayasanList.data) ? adminYayasanList.data.length : 0,
      adminDetail: adminYayasanDetail,
      adminWithdrawalsCount: Array.isArray(adminYayasanWithdrawals.data) ? adminYayasanWithdrawals.data.length : 0,
      approveWithdraw: approveYayasanWithdraw,
    },
    referredUser: {
      register: referredUserRegister,
      referralPrice,
      qris,
      qrisStatus,
      certificateNumber: issueCertificate.data.certificateNumber,
      downloadedCertificate: {
        status: downloadedCertificate.status,
        contentType: downloadedCertificate.headers['content-type'],
        size: downloadedCertificate.buffer.length,
        startsWithPdf: downloadedCertificate.buffer.subarray(0, 4).toString(),
      },
    },
    userReferralProgram: {
      referrerProfileBefore: summarizeResponse(userReferrerProfileBefore),
      referrerProfileAfterRegister: summarizeResponse(userReferrerProfileAfterRegister),
      referrerProfileAfterPayment: summarizeResponse(userReferrerProfileAfterPayment),
      referredUser: summarizeResponse(userReferralRegister),
      referralPrice: summarizeResponse(userReferralPrice),
      qris: summarizeResponse(userReferralQris),
      qrisStatus: summarizeResponse(userReferralQrisStatus),
      expectedBonus: 10000,
      expectedReferralCount: 1,
      referredUserId: userReferral._id,
    },
  };

  report.healthAfter = await requestJson('/health');

  const outputPath = saveReport('manual-flow-report.json', report);
  console.log(JSON.stringify({ outputPath, report }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
