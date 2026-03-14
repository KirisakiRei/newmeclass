import fs from 'fs';
import path from 'path';
import { API_BASE, getRepoRoot } from './shared.mjs';

const requestSamples = {
  RegisterDto: {
    email: 'user@example.com',
    fullName: 'Nama User',
    password: 'Password123!',
    phone: '081234567890',
    referralCode: 'YYSABC123',
  },
  LoginDto: {
    email: 'user@example.com',
    password: 'Password123!',
  },
  UpdateProfileDto: {
    fullName: 'Nama Baru',
    phone: '081234567890',
    birthDate: '2001-01-01',
    province: 'Jawa Barat',
    city: 'Bandung',
  },
  ChangePasswordDto: {
    currentPassword: 'Password123!',
    newPassword: 'PasswordBaru123!',
  },
  ForgotPasswordDto: {
    email: 'user@example.com',
  },
  ResetPasswordDto: {
    token: 'reset-token',
    password: 'PasswordBaru123!',
  },
  UpdateUserDto: {
    fullName: 'Nama Update',
    phone: '081234567890',
    status: 'active',
  },
  ResetUserPasswordDto: {
    newPassword: 'PasswordBaru123!',
  },
  UploadProofDto: {
    paymentAmount: 100000,
    paymentMethod: 'Transfer Bank',
    fileUrl: '/uploads/proof.png',
  },
  ApproveProofDto: {
    status: 'approved',
    rejectionReason: null,
  },
  TopupDto: {
    userId: 'cmxxxx',
    amount: 150000,
    idempotencyKey: 'topup-demo-001',
  },
  PayTestWithWalletDto: {
    userId: 'cmxxxx',
    amount: 100000,
    description: 'Pembayaran test premium',
  },
  UploadUserProofDto: {
    paymentAmount: 100000,
    paymentMethod: 'Transfer Bank',
    fileUrl: '/uploads/proof.png',
  },
  CreateQrisDto: {
    amount: 130000,
    idempotencyKey: 'qris-demo-001',
  },
  CreateTransactionDto: {
    userId: 'cmxxxx',
    amount: 100000,
    paymentMethod: 'qris',
  },
  UpdateReferralSettingsDto: {
    baseCommissionPercent: 10,
    maxCommissionPercent: 35,
  },
  UpdateReferralPriceDto: {
    referralPrice: 20000,
  },
  WithdrawRequestDto: {
    amount: 15000,
    bankName: 'BCA',
    bankAccount: '1234567890',
    accountName: 'Nama Rekening',
    notes: 'Pencairan saldo',
  },
  ProcessWithdrawalDto: {
    status: 'APPROVED',
    notes: 'Disetujui admin',
  },
  UpdateMitraYayasanPriceDto: {
    referralPrice: 20000,
    yayasanShare: 20000,
    mitraShare: 10000,
    totalPrice: 130000,
  },
};

function authType(pathname) {
  if (
    pathname === '/api/health' ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/register') ||
    pathname.startsWith('/api/auth/forgot-password') ||
    pathname.startsWith('/api/auth/reset-password') ||
    pathname.startsWith('/api/admin/login') ||
    pathname.startsWith('/api/admin/register') ||
    pathname.startsWith('/api/yayasan/login') ||
    pathname.startsWith('/api/yayasan/register') ||
    pathname.startsWith('/api/mitra/login') ||
    pathname.startsWith('/api/mitra/register') ||
    pathname.startsWith('/api/settings/test-price') ||
    pathname.startsWith('/api/settings/general') ||
    pathname.startsWith('/api/settings') ||
    pathname.startsWith('/api/questions') ||
    pathname.startsWith('/api/products') ||
    pathname.startsWith('/api/articles') ||
    pathname.startsWith('/api/banners') ||
    pathname.startsWith('/api/running-info') ||
    pathname.startsWith('/api/website-content') ||
    pathname.startsWith('/api/personality-tests') ||
    pathname.startsWith('/api/personality-results') ||
    pathname.startsWith('/api/certificates/verify') ||
    pathname.startsWith('/api/certificates/download') ||
    pathname.startsWith('/api/certificates/generate-newme') ||
    pathname.startsWith('/api/certificates/check-eligibility') ||
    pathname.startsWith('/api/certificates/download-ai-certificate') ||
    pathname.startsWith('/api/contacts') ||
    pathname.startsWith('/api/institutions') ||
    pathname.startsWith('/api/registrations') ||
    pathname.startsWith('/api/analytics')
  ) {
    return 'Public';
  }

  if (pathname.startsWith('/api/admin/') || pathname.includes('/admin/')) {
    return 'Bearer admin/superadmin';
  }

  if (pathname.startsWith('/api/yayasan/') && !pathname.includes('/admin/')) {
    return 'Bearer yayasan';
  }

  if (pathname.startsWith('/api/mitra/') && !pathname.includes('/admin/')) {
    return 'Bearer mitra';
  }

  if (
    pathname.startsWith('/api/auth/me') ||
    pathname.startsWith('/api/auth/profile') ||
    pathname.startsWith('/api/auth/change-password') ||
    pathname.startsWith('/api/auth/referral-link') ||
    pathname.startsWith('/api/test-access') ||
    pathname.startsWith('/api/test-results') ||
    pathname.startsWith('/api/user-payments/upload-proof') ||
    pathname.startsWith('/api/user-payments/my-payments') ||
    pathname.startsWith('/api/user-payments/create-qris')
  ) {
    return 'Bearer user';
  }

  return 'Public atau sesuai role controller';
}

function responseShape(method, pathname) {
  if (pathname.startsWith('/api/health')) {
    return {
      success: true,
      message: 'OK',
      data: {
        status: 'ok',
        timestamp: '2026-03-14T00:00:00.000Z',
        database: { ok: true },
        redis: { ok: true, ping: 'PONG', queue: { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 } },
      },
    };
  }

  if (pathname.endsWith('/login')) {
    return {
      success: true,
      message: 'OK',
      data: {
        token: '<jwt>',
        access_token: '<jwt>',
        user: { _id: 'cmxxxx', email: 'user@example.com', role: 'USER' },
      },
    };
  }

  if (pathname.includes('/wallet/topup')) {
    return {
      success: true,
      message: 'OK',
      data: {
        orderId: 'TOPUP-1773428000000-1234',
        amount: 150000,
        qrCode: 'https://api.qrserver.com/...',
        qrisUrl: 'https://api.qrserver.com/...',
        status: 'pending',
      },
    };
  }

  if (pathname.includes('/user-payments/create-qris')) {
    return {
      success: true,
      message: 'OK',
      data: {
        success: true,
        already_pending: false,
        data: {
          orderId: 'PAY-1773428000000-1234',
          unique_code: 'PAY-1773428000000-1234',
          qris_url: 'https://api.qrserver.com/...',
          amount: 130000,
        },
      },
    };
  }

  if (pathname.includes('/test-results') && method === 'post') {
    return {
      success: true,
      message: 'OK',
      data: {
        resultId: 'cmresult123',
        message: 'Hasil tes berhasil disimpan',
      },
    };
  }

  if (pathname.includes('/certificates/download') || pathname.includes('/certificates/generate-newme')) {
    return 'Binary PDF response with Content-Type: application/pdf';
  }

  if (method === 'get') {
    return {
      success: true,
      message: 'OK',
      data: 'Object atau array sesuai resource',
    };
  }

  return {
    success: true,
    message: 'OK',
    data: 'Object hasil operasi',
  };
}

async function main() {
  const docsResponse = await fetch(`${API_BASE}/docs-json`);
  if (!docsResponse.ok) {
    throw new Error(`Gagal mengambil Swagger JSON dari ${API_BASE}/docs-json`);
  }
  const docs = await docsResponse.json();
  const grouped = Object.entries(docs.paths).reduce((acc, [pathname, methods]) => {
    const section = pathname.split('/')[2] || 'misc';
    acc[section] ||= [];
    acc[section].push([pathname, methods]);
    return acc;
  }, {});

  const lines = [];
  lines.push('# API Endpoint List');
  lines.push('');
  lines.push(`Sumber utama: Swagger runtime di \`${API_BASE}/docs-json\`.`);
  lines.push('');
  lines.push('Catatan umum:');
  lines.push('- Format sukses backend secara umum memakai envelope `{ success, message, data }`.');
  lines.push('- Error validasi umum memakai format NestJS: `{ message, error, statusCode }`.');
  lines.push('- Gunakan header `Content-Type: application/json` untuk request body JSON.');
  lines.push('- Gunakan header `Authorization: Bearer <token>` untuk endpoint private/role-based.');
  lines.push('');

  for (const section of Object.keys(grouped).sort()) {
    lines.push(`## ${section.toUpperCase()}`);
    lines.push('');
    for (const [pathname, methods] of grouped[section].sort((a, b) => a[0].localeCompare(b[0]))) {
      for (const [method, detail] of Object.entries(methods)) {
        const requestBodyRef = detail.requestBody?.content?.['application/json']?.schema?.$ref?.split('/').pop();
        const sampleBody = requestBodyRef ? requestSamples[requestBodyRef] || `Schema ref: ${requestBodyRef}` : 'Tidak ada body';
        const params = (detail.parameters || []).map((item) => ({
          name: item.name,
          in: item.in,
          required: item.required,
          type: item.schema?.type || 'string',
        }));

        lines.push(`### ${method.toUpperCase()} ${pathname}`);
        lines.push('');
        lines.push(`- Auth: ${authType(pathname)}`);
        lines.push(`- Header: ${requestBodyRef ? '`Content-Type: application/json`' : '`Authorization` jika dibutuhkan endpoint private'}`);
        lines.push(`- Params: \`${params.length ? JSON.stringify(params) : '[]'}\``);
        lines.push('- Request body:');
        lines.push('```json');
        lines.push(typeof sampleBody === 'string' ? JSON.stringify(sampleBody, null, 2) : JSON.stringify(sampleBody, null, 2));
        lines.push('```');
        lines.push('- Response sukses:');
        const response = responseShape(method, pathname);
        if (typeof response === 'string') {
          lines.push(`  ${response}`);
        } else {
          lines.push('```json');
          lines.push(JSON.stringify(response, null, 2));
          lines.push('```');
        }
        lines.push('');
      }
    }
  }

  const target = path.join(getRepoRoot(), 'api_endpoint.md');
  fs.writeFileSync(target, `${lines.join('\n')}\n`);
  console.log(JSON.stringify({ outputPath: target, endpointCount: Object.keys(docs.paths).length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
