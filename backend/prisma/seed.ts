import '../src/config/preload-env';
import { Prisma, PrismaClient, Role, AccountStatus, CertificateType } from '@prisma/client';
import { execFile } from 'child_process';
import { resolve } from 'path';
import { promisify } from 'util';
import { hashLocalPassword } from '../src/common/auth/password.utils';
import {
  ensureDemoCertificateTemplate,
  ensureDemoPersonalityTemplates,
} from '../src/common/demo-frontend-reference';
import { MIN_PREMIUM_PRICE } from '../src/common/settings/finance-settings';
import {
  ADMIN_PERMISSION_CATALOG,
  getMappedLegacyRoleSlug,
  getSystemAdminRoles,
  PROTECTED_FULL_ACCESS_ROLE_SLUG,
} from '../src/modules/admin-rbac/admin-permission-catalog';
import { CoreScoringCatalogService } from '../src/modules/scoring/core-scoring-catalog.service';
import { DEFAULT_QUESTION_CATALOG } from '../src/modules/questions/default-question-catalog';

const prisma = new PrismaClient();
const execFileAsync = promisify(execFile);
const LEGACY_PREMIUM_PRICE = 100000;

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryablePrismaError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
}

async function runWithRetry<T>(label: string, task: () => Promise<T>, maxAttempts = 4): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!isRetryablePrismaError(error) || attempt >= maxAttempts) {
        throw error;
      }
      console.warn(
        `${label} hit a retryable Prisma deadlock/write-conflict. Retrying attempt ${attempt + 1}/${maxAttempts}.`,
      );
      await sleep(150 * attempt);
    }
  }

  throw lastError;
}

async function ensureSeedLandingReferenceContent() {
  const backendRoot = resolve(__dirname, '..', '..');
  await execFileAsync(process.execPath, ['scripts/sync-landing-reference-content.mjs'], {
    cwd: backendRoot,
    env: process.env,
  });
}

function normalizeSeedPremiumPrice(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return MIN_PREMIUM_PRICE;
  if (parsed === LEGACY_PREMIUM_PRICE) return MIN_PREMIUM_PRICE;
  return Math.max(parsed, MIN_PREMIUM_PRICE);
}

async function seedCore() {
  for (const item of ADMIN_PERMISSION_CATALOG) {
    await prisma.adminPermission.upsert({
      where: { key: item.key },
      update: {
        groupKey: item.groupKey,
        groupLabel: item.groupLabel,
        groupOrder: item.groupOrder,
        pageKey: item.pageKey,
        pageLabel: item.pageLabel,
        pageOrder: item.pageOrder,
        actionKey: item.actionKey,
        actionLabel: item.actionLabel,
        actionOrder: item.actionOrder,
        isSystem: true,
      },
      create: {
        key: item.key,
        groupKey: item.groupKey,
        groupLabel: item.groupLabel,
        groupOrder: item.groupOrder,
        pageKey: item.pageKey,
        pageLabel: item.pageLabel,
        pageOrder: item.pageOrder,
        actionKey: item.actionKey,
        actionLabel: item.actionLabel,
        actionOrder: item.actionOrder,
        isSystem: true,
      },
    });
  }

  const permissionRows = await prisma.adminPermission.findMany({
    select: { id: true, key: true },
  });
  const permissionIdByKey = new Map(permissionRows.map((item) => [item.key, item.id]));

  for (const role of getSystemAdminRoles()) {
    const roleRow = await prisma.adminRole.upsert({
      where: { slug: role.slug },
      update: {
        name: role.name,
        description: role.description,
        isProtected: role.isProtected,
        isSystem: true,
      },
      create: {
        name: role.name,
        slug: role.slug,
        description: role.description,
        isProtected: role.isProtected,
        isSystem: true,
      },
    });

    await prisma.adminRolePermission.deleteMany({ where: { roleId: roleRow.id } });
    await prisma.adminRolePermission.createMany({
      data: role.permissions
        .map((key) => permissionIdByKey.get(key))
        .filter(Boolean)
        .map((permissionId) => ({
          roleId: roleRow.id,
          permissionId: String(permissionId),
        })),
      skipDuplicates: true,
    });
  }

  const protectedRole = await prisma.adminRole.findUnique({
    where: { slug: PROTECTED_FULL_ACCESS_ROLE_SLUG },
    select: { id: true },
  });
  const developerRole = await prisma.adminRole.findUnique({
    where: { slug: 'developer-root' },
    select: { id: true },
  });

  const seedAdmin = await prisma.user.upsert({
    where: { email: process.env.SEED_SUPERADMIN_EMAIL || 'admin@newme.id' },
    update: {
      username: process.env.SEED_SUPERADMIN_USERNAME || 'superadmin',
      adminRoleId: protectedRole?.id || null,
    },
    create: {
      email: process.env.SEED_SUPERADMIN_EMAIL || 'admin@newme.id',
      username: process.env.SEED_SUPERADMIN_USERNAME || 'superadmin',
      fullName: process.env.SEED_SUPERADMIN_NAME || 'Super Admin',
      passwordHash: await hashLocalPassword(process.env.SEED_SUPERADMIN_PASSWORD || 'ChangeMeNow123!'),
      role: Role.SUPERADMIN,
      adminRoleId: protectedRole?.id || null,
      status: AccountStatus.ACTIVE,
      myReferralCode: 'ADMIN001',
      wallet: { create: { availableBalance: 0, reserveBalance: 0 } },
    },
  });

  const developerEmail = String(process.env.SEED_DEVELOPER_EMAIL || 'developer@newme.id').trim().toLowerCase();
  const developerUsername = String(process.env.SEED_DEVELOPER_USERNAME || 'developer').trim().toLowerCase();
  const developerName = String(process.env.SEED_DEVELOPER_NAME || 'Developer Root').trim() || 'Developer Root';

  const existingDeveloper =
    (await prisma.user.findUnique({
      where: { email: developerEmail },
      select: { id: true },
    }))
    || (await prisma.user.findFirst({
      where: { username: developerUsername },
      select: { id: true },
    }));

  if (existingDeveloper) {
    await prisma.user.update({
      where: { id: existingDeveloper.id },
      data: {
        email: developerEmail,
        username: developerUsername,
        fullName: developerName,
        role: Role.DEVELOPER,
        status: AccountStatus.ACTIVE,
        adminRoleId: developerRole?.id || null,
      },
    });
  } else {
    await prisma.user.create({
      data: {
        email: developerEmail,
        username: developerUsername,
        fullName: developerName,
        passwordHash: await hashLocalPassword(process.env.SEED_DEVELOPER_PASSWORD || 'udahlupa'),
        role: Role.DEVELOPER,
        status: AccountStatus.ACTIVE,
        adminRoleId: developerRole?.id || null,
        wallet: { create: { availableBalance: 0, reserveBalance: 0 } },
      },
    });
  }

  const existingAdmins = await prisma.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.SUPERADMIN, Role.OPERATOR, Role.DEVELOPER] } },
    select: { id: true, email: true, role: true, username: true, adminRoleId: true, adminRole: { select: { slug: true } } },
  });

  const roleRows = await prisma.adminRole.findMany({
    select: { id: true, slug: true },
  });
  const roleIdBySlug = new Map(roleRows.map((item) => [item.slug, item.id]));

  for (const admin of existingAdmins) {
    const data: Record<string, any> = {};
    if (!admin.username) {
      const base = String(admin.email || 'admin')
        .split('@')[0]
        .replace(/[^a-zA-Z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'admin';
      let candidate = base;
      let sequence = 0;
      while (true) {
        const conflict = await prisma.user.findFirst({
          where: { username: candidate, id: { not: admin.id } },
          select: { id: true },
        });
        if (!conflict) break;
        sequence += 1;
        candidate = `${base}-${String(sequence).padStart(2, '0')}`;
      }
      data.username = candidate;
    }

    if (!admin.adminRoleId) {
      const mappedRoleSlug = getMappedLegacyRoleSlug(admin.role);
      if (mappedRoleSlug && roleIdBySlug.has(mappedRoleSlug)) {
        data.adminRoleId = roleIdBySlug.get(mappedRoleSlug);
      }
    } else {
      const mappedRoleSlug = getMappedLegacyRoleSlug(admin.role);
      if (mappedRoleSlug && roleIdBySlug.has(mappedRoleSlug) && admin.adminRole?.slug !== mappedRoleSlug) {
        data.adminRoleId = roleIdBySlug.get(mappedRoleSlug);
      }
    }

    if (Object.keys(data).length > 0) {
      await prisma.user.update({
        where: { id: admin.id },
        data,
      });
    }
  }

  const generalRow = await prisma.setting.findUnique({
    where: { key: 'general' },
  });
  const generalValue = ((generalRow?.value as Record<string, any>) || {});
  const nextGeneralValue = {
    ...generalValue,
    maintenanceMode: Boolean(generalValue.maintenanceMode ?? false),
    testPrice: normalizeSeedPremiumPrice(generalValue.testPrice),
    paymentAmount: normalizeSeedPremiumPrice(generalValue.paymentAmount),
  };

  await prisma.setting.upsert({
    where: { key: 'general' },
    update: {
      value: nextGeneralValue,
    },
    create: {
      key: 'general',
      value: nextGeneralValue,
    },
  });

  for (const pricingKey of ['paymentAmount', 'testPrice'] as const) {
    const existingPricingRow = await prisma.setting.findUnique({
      where: { key: pricingKey },
    });
    const nextPricingValue = normalizeSeedPremiumPrice(existingPricingRow?.value);
    await prisma.setting.upsert({
      where: { key: pricingKey },
      update: { value: nextPricingValue },
      create: { key: pricingKey, value: nextPricingValue },
    });
  }

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

  const existingQuestions = await prisma.question.findMany({
    select: { text: true, testType: true, order: true },
    orderBy: { order: 'asc' },
  });
  const existingQuestionKeys = new Set(
    existingQuestions.map((question) => `${question.text}::${question.testType}`),
  );
  let nextQuestionOrder =
    existingQuestions.reduce((maxOrder, question) => Math.max(maxOrder, question.order), -1) + 1;

  for (const question of DEFAULT_QUESTION_CATALOG) {
    const questionKey = `${question.text}::${question.testType}`;
    if (existingQuestionKeys.has(questionKey)) {
      continue;
    }

    await prisma.question.create({
      data: {
        text: question.text,
        type: 'multiple_choice',
        category: question.category,
        testType: question.testType,
        socialDimension: question.socialDimension,
        targetElement: question.targetElement || null,
        isRequired: true,
        isActive: true,
        order: nextQuestionOrder,
        variants: question.variants
          ? (question.variants as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        options: {
          create: question.options.map((option, optionIndex) => ({
            label: option.text,
            value: option.value,
            scores: option.scores,
            order: optionIndex,
          })),
        },
      },
    });

    nextQuestionOrder += 1;
  }

  await new CoreScoringCatalogService(prisma as any).ensureQuestionCatalog();

  await ensureDemoPersonalityTemplates(prisma as any);
  await ensureDemoCertificateTemplate(prisma as any, CertificateType.INDIVIDU);
  await ensureDemoCertificateTemplate(prisma as any, CertificateType.YAYASAN);
  await ensureSeedLandingReferenceContent();
}

async function main() {
  await runWithRetry('Prisma seed', async () => {
    await seedCore();
  });
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
