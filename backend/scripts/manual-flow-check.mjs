import {
  completeOtpRegistration,
  extractAccessToken,
  extractCsrfToken,
  extractAuthSubject,
  extractItems,
  requestBuffer,
  requestJson,
  settleOrder,
  pollUntil,
  saveReport,
  uniqueEmail,
  uniquePhone,
} from './shared.mjs';

const ADMIN_USERNAME = process.env.SEED_SUPERADMIN_USERNAME || 'superadmin';
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
  const all = extractItems(questions.body);
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
    body: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD },
  });
  requireOk('admin login', adminLogin);
  const adminToken = extractAccessToken(adminLogin);
  const adminCsrfToken = extractCsrfToken(adminLogin);
  const questions = await ensureQuestions();
  const freeAnswers = Object.fromEntries(questions.free.map((item) => [item._id, 0]));
  const paidAnswers = Object.fromEntries(questions.paid.map((item) => [item._id, 1]));

  const individualRegistration = await completeOtpRegistration('/auth', {
    startBody: {
      email: uniqueEmail('individual', stamp, 1),
      fullName: 'Manual Individual User',
      password: 'Password123!',
    },
    completeBody: {
      phone: uniquePhone('0811', stamp, 1),
      whatsapp: uniquePhone('0811', stamp, 1),
      address: 'Jl. Manual Individual 1',
    },
  });
  requireOk('individual register start', individualRegistration.start);
  requireOk('individual register verify', individualRegistration.verify);
  requireOk('individual register complete', individualRegistration.complete);
  const individualRegister = individualRegistration.complete;
  const individualUser = extractAuthSubject(individualRegister, 'user');
  const individualLogin = await requestJson('/auth/login', {
    method: 'POST',
    body: { email: individualUser.email, password: 'Password123!' },
  });
  requireOk('individual login', individualLogin);
  const individualToken = extractAccessToken(individualLogin);
  const individualCsrfToken = extractCsrfToken(individualLogin);
  const individualProfile = await requestJson('/auth/me', { token: individualToken });
  const freeSubmit = await requestJson('/test-results', {
    method: 'POST',
    token: individualToken,
    csrfToken: individualCsrfToken,
    body: { userId: individualUser._id || individualUser.id, testType: 'free', category: 'general', answers: freeAnswers },
  });
  const freeAccess = await requestJson('/test-access/check', { token: individualToken });
  const topup = await requestJson('/wallet/topup', {
    method: 'POST',
    token: individualToken,
    csrfToken: individualCsrfToken,
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
    csrfToken: individualCsrfToken,
    body: {
      amount: 100000,
      description: 'Manual flow premium payment',
    },
  });
  const paidSubmit = await requestJson('/test-results', {
    method: 'POST',
    token: individualToken,
    csrfToken: individualCsrfToken,
    body: { userId: individualUser._id || individualUser.id, testType: 'paid', category: 'general', answers: paidAnswers },
  });
  const generatedCertificate = await requestBuffer(`/certificates/generate-newme/${individualUser._id || individualUser.id}`);

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

  const mitraEmail = uniqueEmail('mitra', stamp, 1);
  const mitraPhone = uniquePhone('0821', stamp, 1);
  const mitraInvite = await requestJson('/mitra/admin', {
    method: 'POST',
    token: adminToken,
    csrfToken: adminCsrfToken,
    body: {
      email: mitraEmail,
      fullName: 'Manual Mitra',
      phone: mitraPhone,
    },
  });
  requireOk('mitra admin create', mitraInvite);
  const mitraInviteUrl = String(mitraInvite.data?.invite?.inviteUrl || '').trim();
  const mitraInviteToken = mitraInviteUrl ? new URL(mitraInviteUrl).searchParams.get('token') : null;
  if (!mitraInviteToken) {
    throw new Error('Token invite mitra tidak tersedia dari admin create.');
  }
  const mitraRegister = await requestJson('/mitra/invite/claim', {
    method: 'POST',
    body: {
      token: mitraInviteToken,
      email: mitraEmail,
      fullName: 'Manual Mitra',
      password: 'Password123!',
      phone: mitraPhone,
      address: 'Jl. Manual Mitra',
      description: 'Mitra untuk smoke test',
    },
  });
  requireOk('mitra invite claim', mitraRegister);
  const mitraUser = extractAuthSubject(mitraRegister, 'mitra');
  const mitraToken = extractAccessToken(mitraRegister);
  const mitraCsrfToken = extractCsrfToken(mitraRegister);
  const mitraVerify = await requestJson(`/mitra/admin/${mitraUser._id || mitraUser.id}/verify`, {
    method: 'PUT',
    token: adminToken,
    csrfToken: adminCsrfToken,
    body: {},
  });
  const mitraMe = await requestJson('/mitra/me', { token: mitraToken });

  const yayasanRegistration = await completeOtpRegistration('/yayasan', {
    startBody: {
      email: uniqueEmail('yayasan', stamp, 1),
      fullName: 'Manual Yayasan',
      password: 'Password123!',
      referralCode: mitraMe.data.inviteCode,
    },
    completeBody: {
      phone: uniquePhone('0831', stamp, 1),
      referralCode: mitraMe.data.inviteCode,
      address: 'Jl. Manual Yayasan',
      description: 'Yayasan untuk smoke test',
    },
  });
  requireOk('yayasan register start', yayasanRegistration.start);
  requireOk('yayasan register verify', yayasanRegistration.verify);
  requireOk('yayasan register complete', yayasanRegistration.complete);
  const yayasanRegister = yayasanRegistration.complete;
  const yayasanUser = extractAuthSubject(yayasanRegister, 'yayasan');
  const yayasanToken = extractAccessToken(yayasanRegister);
  const yayasanCsrfToken = yayasanRegistration.csrfToken || extractCsrfToken(yayasanRegister);
  const yayasanVerify = await requestJson(`/yayasan/admin/${yayasanUser._id || yayasanUser.id}/verify`, {
    method: 'PUT',
    token: adminToken,
    csrfToken: adminCsrfToken,
    body: {},
  });
  const mitraSetPrice = await requestJson(`/mitra/yayasan/${yayasanUser._id || yayasanUser.id}/price`, {
    method: 'PUT',
    token: mitraToken,
    csrfToken: mitraCsrfToken,
    body: { yayasanShare: 100000, mitraShare: 50000, totalPrice: 250000 },
  });
  const yayasanMe = await requestJson('/yayasan/me', { token: yayasanToken });

  const referredUserRegistration = await completeOtpRegistration('/auth', {
    startBody: {
      email: uniqueEmail('referred-user', stamp, 1),
      fullName: 'Manual Referred User',
      password: 'Password123!',
      referralCode: yayasanMe.data.referralCode,
    },
    completeBody: {
      phone: uniquePhone('0841', stamp, 1),
      whatsapp: uniquePhone('0841', stamp, 1),
      referralCode: yayasanMe.data.referralCode,
      address: 'Jl. Referral Yayasan 1',
      referralSource: 'yayasan',
    },
  });
  requireOk('yayasan referred user register start', referredUserRegistration.start);
  requireOk('yayasan referred user register verify', referredUserRegistration.verify);
  requireOk('yayasan referred user register complete', referredUserRegistration.complete);
  const referredUserRegister = referredUserRegistration.complete;
  const referredUser = extractAuthSubject(referredUserRegister, 'user');
  const referredToken = extractAccessToken(referredUserRegister);
  const referredCsrfToken = referredUserRegistration.csrfToken || extractCsrfToken(referredUserRegister);
  const referralPrice = await requestJson(`/user-payments/test-price?referralCode=${yayasanMe.data.referralCode}`);
  const qris = await requestJson('/user-payments/create-qris', {
    method: 'POST',
    token: referredToken,
    csrfToken: referredCsrfToken,
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
    csrfToken: yayasanCsrfToken,
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
    csrfToken: mitraCsrfToken,
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
    csrfToken: adminCsrfToken,
    body: { status: 'APPROVED', notes: 'Approved in manual flow' },
  });
  const approveMitraWithdraw = await requestJson(`/mitra/admin/withdrawals/${mitraWithdraw.data._id}/approve`, {
    method: 'PUT',
    token: adminToken,
    csrfToken: adminCsrfToken,
    body: { status: 'APPROVED', notes: 'Approved in manual flow' },
  });
  const yayasanWalletAfterWithdraw = await requestJson('/yayasan/wallet', { token: yayasanToken });
  const mitraWalletAfterWithdraw = await requestJson('/mitra/wallet', { token: mitraToken });
  const issueCertificate = await requestJson('/certificates/issue', {
    method: 'POST',
    token: adminToken,
    csrfToken: adminCsrfToken,
    body: {
      userId: referredUser._id || referredUser.id,
      certType: 'INDIVIDU',
      courseName: 'NEWME Premium',
      userName: referredUser.name,
      userEmail: referredUser.email,
    },
  });
  const downloadedCertificate = await requestBuffer(`/certificates/download/${issueCertificate.data.certificateNumber}`);

  const userReferrerRegistration = await completeOtpRegistration('/auth', {
    startBody: {
      email: uniqueEmail('user-referrer', stamp, 1),
      fullName: 'Manual User Referrer',
      password: 'Password123!',
    },
    completeBody: {
      phone: uniquePhone('0851', stamp, 1),
      whatsapp: uniquePhone('0851', stamp, 1),
      address: 'Jl. Referral User 1',
    },
  });
  requireOk('user referrer register start', userReferrerRegistration.start);
  requireOk('user referrer register verify', userReferrerRegistration.verify);
  requireOk('user referrer register complete', userReferrerRegistration.complete);
  const userReferrerRegister = userReferrerRegistration.complete;
  const userReferrer = extractAuthSubject(userReferrerRegister, 'user');
  const userReferrerToken = extractAccessToken(userReferrerRegister);
  const userReferrerCsrfToken = userReferrerRegistration.csrfToken || extractCsrfToken(userReferrerRegister);
  const userReferrerProfileBefore = await requestJson('/auth/me', { token: userReferrerToken });

  const userReferralRegistration = await completeOtpRegistration('/auth', {
    startBody: {
      email: uniqueEmail('user-referred', stamp, 1),
      fullName: 'Manual User Referred',
      password: 'Password123!',
      referralCode: userReferrer.myReferralCode,
    },
    completeBody: {
      phone: uniquePhone('0861', stamp, 1),
      whatsapp: uniquePhone('0861', stamp, 1),
      referralCode: userReferrer.myReferralCode,
      address: 'Jl. Referral User 2',
      referralSource: 'user',
    },
  });
  requireOk('user referred register start', userReferralRegistration.start);
  requireOk('user referred register verify', userReferralRegistration.verify);
  requireOk('user referred register complete', userReferralRegistration.complete);
  const userReferralRegister = userReferralRegistration.complete;
  const userReferral = extractAuthSubject(userReferralRegister, 'user');
  const userReferralToken = extractAccessToken(userReferralRegister);
  const userReferralCsrfToken = userReferralRegistration.csrfToken || extractCsrfToken(userReferralRegister);
  const userReferrerProfileAfterRegister = await requestJson('/auth/me', { token: userReferrerToken });
  const userReferralPrice = await requestJson(`/user-payments/test-price?referralCode=${userReferrer.myReferralCode}`);
  const userReferralQris = await requestJson('/user-payments/create-qris', {
    method: 'POST',
    token: userReferralToken,
    csrfToken: userReferralCsrfToken,
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
