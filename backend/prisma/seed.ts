import { PrismaClient, Role, AccountStatus, CertificateType } from '@prisma/client';
import { createHash } from 'crypto';
import {
  ensureDemoCertificateTemplate,
  ensureDemoPersonalityTemplates,
} from '../src/common/demo-frontend-reference';

const prisma = new PrismaClient();

function hashPassword(password: string) {
  return createHash('sha256').update(password).digest('hex');
}

async function main() {
  await prisma.user.upsert({
    where: { email: process.env.SEED_SUPERADMIN_EMAIL || 'admin@newme.id' },
    update: {},
    create: {
      email: process.env.SEED_SUPERADMIN_EMAIL || 'admin@newme.id',
      fullName: process.env.SEED_SUPERADMIN_NAME || 'Super Admin',
      passwordHash: hashPassword(process.env.SEED_SUPERADMIN_PASSWORD || 'ChangeMeNow123!'),
      role: Role.SUPERADMIN,
      status: AccountStatus.ACTIVE,
      myReferralCode: 'ADMIN001',
      wallet: { create: { availableBalance: 0, reserveBalance: 0 } },
    },
  });

  await prisma.setting.upsert({
    where: { key: 'general' },
    update: {},
    create: {
      key: 'general',
      value: {
        maintenanceMode: false,
        testPrice: 100000,
        paymentAmount: 100000,
      },
    },
  });

  await prisma.referralSetting.upsert({
    where: { id: 'default-ref-setting' },
    update: {},
    create: {
      id: 'default-ref-setting',
      baseCommissionPercent: 10,
      maxCommissionPercent: 35,
    },
  });

  await prisma.setting.upsert({
    where: { key: 'userReferralContent' },
    update: {},
    create: {
      key: 'userReferralContent',
      value: {
        title: 'Program Referral NEWME',
        description: 'Ajak teman bergabung dan dapatkan bonus setelah mereka menyelesaikan pembayaran premium.',
        benefits: [
          'Bonus Rp 10.000 untuk setiap referral yang menyelesaikan pembayaran premium.',
          'Jumlah referral bertambah otomatis saat akun referral berhasil dibuat.',
          'Link referral bisa langsung dibagikan ke calon pengguna baru.',
        ],
        termsAndConditions:
          'Bonus referral diberikan satu kali untuk setiap pengguna baru yang mendaftar menggunakan link Anda dan menyelesaikan pembayaran premium. Bonus tidak berlaku ganda untuk pembayaran yang sama.',
      },
    },
  });

  await ensureDemoPersonalityTemplates(prisma as any);
  await ensureDemoCertificateTemplate(prisma as any, CertificateType.INDIVIDU);
  await ensureDemoCertificateTemplate(prisma as any, CertificateType.YAYASAN);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
