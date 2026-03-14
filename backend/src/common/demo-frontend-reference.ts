import { CertificateType, PrismaClient } from '@prisma/client';
import { existsSync } from 'fs';
import { pathToFileURL } from 'url';
import { resolve } from 'path';

type DemoModule = {
  personalityResults?: any[];
  certificateTemplateIndividu?: Record<string, any> | null;
  certificateTemplateYayasan?: Record<string, any> | null;
};

type PersonalityTemplateRecord = {
  code: string;
  socialType: string;
  element: string;
  label: string;
  color: string;
  aiAnalysis: Record<string, any>;
  insights: Record<string, any>;
};

type CertificateTemplateInput = {
  certType: string;
  titleText: string;
  subtitleText: string;
  completionText: string;
  signerName: string;
  signerTitle: string;
  textColor: string;
  accentColor: string;
  backgroundUrl: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
  organization: string;
  layoutPositions: Record<string, any>;
};

type CertificateTemplateRow = {
  id?: string;
  certType: CertificateType;
  title: string;
  body: string | null;
  backgroundUrl: string | null;
  logoUrl: string | null;
  signatureUrl: string | null;
};

type DemoReferenceClient = Pick<PrismaClient, 'personalityResultTemplate' | 'certificateTemplate'>;
type DemoReferenceClientWithSettings = Pick<
  PrismaClient,
  'personalityResultTemplate' | 'certificateTemplate' | 'setting'
>;

let demoModulePromise: Promise<DemoModule> | null = null;
let personalityEnsurePromise: Promise<void> | null = null;
const certificateEnsurePromises = new Map<CertificateType, Promise<void>>();
const dynamicImport = new Function(
  'modulePath',
  'return import(modulePath)',
) as (modulePath: string) => Promise<DemoModule>;
const CERTIFICATE_TEMPLATE_SETTING_PREFIX = 'certificate-template:';

const DEFAULT_CERTIFICATE_TEMPLATE: Record<CertificateType, CertificateTemplateInput> = {
  INDIVIDU: {
    certType: 'individu',
    titleText: 'SERTIFIKAT',
    subtitleText: 'Personality Assessment Program',
    completionText:
      'Telah berhasil menyelesaikan program asesmen kepribadian dan dinyatakan kompeten dalam memahami profil kepribadian melalui metode 5 Element.',
    signerName: 'Dr. Rina Wijaya, M.Psi',
    signerTitle: 'Direktur NEWMECLASS',
    textColor: '#1a1a1a',
    accentColor: '#1a1a1a',
    backgroundUrl: null,
    logoUrl: '/logo.png',
    signatureUrl: null,
    organization: 'PT. MITRA SEMESTA EDUCLASS',
    layoutPositions: {
      logo: { x: 50, y: 8, width: 12 },
      signature: { x: 50, y: 75, width: 10 },
    },
  },
  YAYASAN: {
    certType: 'yayasan',
    titleText: 'SERTIFIKAT VIP',
    subtitleText: 'Exclusive Personality Development Program',
    completionText:
      'Telah berhasil menyelesaikan program pengembangan kepribadian eksklusif melalui Yayasan dan dinyatakan kompeten dalam memahami potensi diri.',
    signerName: 'Dr. Rina Wijaya, M.Psi',
    signerTitle: 'Direktur NEWMECLASS',
    textColor: '#2c1810',
    accentColor: '#B8860B',
    backgroundUrl: null,
    logoUrl: '/logo.png',
    signatureUrl: null,
    organization: 'PT. MITRA SEMESTA EDUCLASS',
    layoutPositions: {
      logo: { x: 50, y: 8, width: 14 },
      signature: { x: 50, y: 75, width: 11 },
    },
  },
};

const safeObject = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};

const safeArray = (value: unknown) => (Array.isArray(value) ? value : []);

const safeString = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const safePathCandidates = () => [
  resolve(process.cwd(), '..', 'code demo frontend', 'utils', 'mockData.js'),
  resolve(process.cwd(), 'code demo frontend', 'utils', 'mockData.js'),
  resolve(__dirname, '..', '..', '..', '..', 'code demo frontend', 'utils', 'mockData.js'),
];

async function loadDemoModule(): Promise<DemoModule> {
  if (!demoModulePromise) {
    demoModulePromise = (async () => {
      const demoPath = safePathCandidates().find((candidate) => existsSync(candidate));
      if (!demoPath) {
        return {};
      }
      const loaded = await dynamicImport(pathToFileURL(demoPath).href);
      return loaded as DemoModule;
    })();
  }

  return demoModulePromise;
}

export async function getDemoPersonalityTemplates(): Promise<PersonalityTemplateRecord[]> {
  const module = await loadDemoModule();
  return safeArray(module.personalityResults)
    .map((item) => {
      const row = safeObject(item);
      const code = safeString(row.code);
      if (!code) return null;
      return {
        code,
        socialType: safeString(row.socialType, 'ambivert'),
        element: safeString(row.element, 'kayu').toLowerCase(),
        label: safeString(row.label, code),
        color: safeString(row.color, '#888888'),
        aiAnalysis: safeObject(row.aiAnalysis),
        insights: safeObject(row.insights),
      };
    })
    .filter(Boolean) as PersonalityTemplateRecord[];
}

export async function ensureDemoPersonalityTemplates(db: DemoReferenceClient) {
  if (!personalityEnsurePromise) {
    personalityEnsurePromise = (async () => {
      const demoRows = await getDemoPersonalityTemplates();
      if (!demoRows.length) return;

      const existing = await db.personalityResultTemplate.findMany({
        select: { code: true },
      });
      const existingCodes = new Set(existing.map((row) => row.code));
      const missingRows = demoRows.filter((row) => !existingCodes.has(row.code));

      if (!missingRows.length) return;

      await Promise.all(
        missingRows.map((row) =>
          db.personalityResultTemplate.create({
            data: {
              code: row.code,
              socialType: row.socialType,
              element: row.element,
              label: row.label,
              color: row.color,
              aiAnalysis: row.aiAnalysis,
              insights: row.insights,
            },
          }),
        ),
      );
    })().finally(() => {
      personalityEnsurePromise = null;
    });
  }

  return personalityEnsurePromise;
}

export async function getDemoCertificateTemplate(certType: CertificateType): Promise<CertificateTemplateInput> {
  const module = await loadDemoModule();
  const fallback = DEFAULT_CERTIFICATE_TEMPLATE[certType];
  const raw =
    certType === CertificateType.INDIVIDU
      ? safeObject(module.certificateTemplateIndividu)
      : safeObject(module.certificateTemplateYayasan);

  return {
    certType: certType === CertificateType.INDIVIDU ? 'individu' : 'yayasan',
    titleText: safeString(raw.titleText, fallback.titleText),
    subtitleText: safeString(raw.subtitleText, fallback.subtitleText),
    completionText: safeString(raw.completionText, fallback.completionText),
    signerName: safeString(raw.signerName, fallback.signerName),
    signerTitle: safeString(raw.signerTitle, fallback.signerTitle),
    textColor: safeString(raw.textColor, fallback.textColor),
    accentColor: safeString(raw.accentColor, fallback.accentColor),
    backgroundUrl:
      typeof raw.backgroundUrl === 'string' || raw.backgroundUrl === null
        ? raw.backgroundUrl
        : fallback.backgroundUrl,
    logoUrl:
      typeof raw.logoUrl === 'string' || raw.logoUrl === null
        ? raw.logoUrl
        : fallback.logoUrl,
    signatureUrl:
      typeof raw.signatureUrl === 'string' || raw.signatureUrl === null
        ? raw.signatureUrl
        : fallback.signatureUrl,
    organization: safeString(raw.organization, fallback.organization),
    layoutPositions: Object.keys(safeObject(raw.layoutPositions)).length
      ? safeObject(raw.layoutPositions)
      : fallback.layoutPositions,
  };
}

const certificateTemplateSettingKey = (certType: CertificateType) =>
  `${CERTIFICATE_TEMPLATE_SETTING_PREFIX}${String(certType).toLowerCase()}`;

export function buildCertificateTemplateMetadata(
  certType: CertificateType,
  input: Record<string, any>,
) : CertificateTemplateInput {
  const defaults = DEFAULT_CERTIFICATE_TEMPLATE[certType];
  return {
    certType: certType === CertificateType.INDIVIDU ? 'individu' : 'yayasan',
    titleText: safeString(input.titleText || input.title, defaults.titleText),
    subtitleText: safeString(input.subtitleText, defaults.subtitleText),
    completionText: safeString(input.completionText, defaults.completionText),
    signerName: safeString(input.signerName, defaults.signerName),
    signerTitle: safeString(input.signerTitle, defaults.signerTitle),
    textColor: safeString(input.textColor, defaults.textColor),
    accentColor: safeString(input.accentColor, defaults.accentColor),
    organization: safeString(input.organization, defaults.organization),
    layoutPositions: Object.keys(safeObject(input.layoutPositions)).length
      ? safeObject(input.layoutPositions)
      : defaults.layoutPositions,
    backgroundUrl:
      typeof input.backgroundUrl === 'string' || input.backgroundUrl === null
        ? input.backgroundUrl
        : defaults.backgroundUrl,
    logoUrl:
      typeof input.logoUrl === 'string' || input.logoUrl === null
        ? input.logoUrl
        : defaults.logoUrl,
    signatureUrl:
      typeof input.signatureUrl === 'string' || input.signatureUrl === null
        ? input.signatureUrl
        : defaults.signatureUrl,
  };
}

export function serializeCertificateTemplateForStorage(
  certType: CertificateType,
  input: Record<string, any>,
) {
  const payload = buildCertificateTemplateMetadata(certType, input);
  return {
    certType,
    title: payload.titleText,
    body: null,
    backgroundUrl: payload.backgroundUrl,
    logoUrl: payload.logoUrl,
    signatureUrl: payload.signatureUrl,
  };
}

export async function ensureDemoCertificateTemplate(
  db: DemoReferenceClientWithSettings,
  certType: CertificateType,
) {
  if (!certificateEnsurePromises.has(certType)) {
    certificateEnsurePromises.set(
      certType,
      (async () => {
        const existing = await db.certificateTemplate.findUnique({
          where: { certType },
        });
        if (existing) return;

        const template = await getDemoCertificateTemplate(certType);
        const payload = serializeCertificateTemplateForStorage(certType, template);
        const metadata = buildCertificateTemplateMetadata(certType, template);
        await db.certificateTemplate.create({ data: payload });
        await db.setting.upsert({
          where: { key: certificateTemplateSettingKey(certType) },
          update: { value: metadata as any },
          create: {
            key: certificateTemplateSettingKey(certType),
            value: metadata as any,
          },
        });
      })().finally(() => {
        certificateEnsurePromises.delete(certType);
      }),
    );
  }

  return certificateEnsurePromises.get(certType);
}

export async function mapCertificateTemplateForClient(
  db: Pick<PrismaClient, 'setting'>,
  row: CertificateTemplateRow | null,
) {
  if (!row) return null;

  const certType = row.certType;
  const defaults = await getDemoCertificateTemplate(certType);
  const storedSetting = await db.setting.findUnique({
    where: { key: certificateTemplateSettingKey(certType) },
  });
  const storedValue = safeObject(storedSetting?.value);
  const parsed = (() => {
    try {
      return safeObject(row.body ? JSON.parse(row.body) : null);
    } catch {
      return {};
    }
  })();
  const merged = {
    ...parsed,
    ...storedValue,
  };

  return {
    _id: row.id || null,
    id: row.id || null,
    certType: certType === CertificateType.INDIVIDU ? 'individu' : 'yayasan',
    titleText: safeString(row.title, defaults.titleText),
    subtitleText: safeString(merged.subtitleText, defaults.subtitleText),
    completionText: safeString(merged.completionText, defaults.completionText),
    signerName: safeString(merged.signerName, defaults.signerName),
    signerTitle: safeString(merged.signerTitle, defaults.signerTitle),
    textColor: safeString(merged.textColor, defaults.textColor),
    accentColor: safeString(merged.accentColor, defaults.accentColor),
    backgroundUrl: row.backgroundUrl ?? defaults.backgroundUrl,
    logoUrl: row.logoUrl ?? defaults.logoUrl,
    signatureUrl: row.signatureUrl ?? defaults.signatureUrl,
    organization: safeString(merged.organization, defaults.organization),
    layoutPositions: Object.keys(safeObject(merged.layoutPositions)).length
      ? safeObject(merged.layoutPositions)
      : defaults.layoutPositions,
  };
}
