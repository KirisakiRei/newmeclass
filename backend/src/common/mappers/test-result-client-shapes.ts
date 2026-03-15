import { PrismaService } from 'src/modules/prisma/prisma.service';
import { ensureDemoPersonalityTemplates } from 'src/common/demo-frontend-reference';
import {
  buildDisplayAnalysis,
  buildLegacyPremiumInsights,
  buildTemplateInsights,
} from 'src/common/personality-result-shape';

type AnyRecord = Record<string, any>;

const safeObject = (value: unknown): AnyRecord =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as AnyRecord)
    : {};

const safeString = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const stripReservedAnalysisFields = (value: unknown) => {
  const source = safeObject(value);
  const next = { ...source };
  delete next.aiAnalysis;
  delete next.legacyAiInsights;
  return next;
};

const isNonEmptyObject = (value: unknown) => Object.keys(safeObject(value)).length > 0;

async function findTemplateForResult(db: PrismaService, result: AnyRecord) {
  await ensureDemoPersonalityTemplates(db);

  if (result.personalityCode) {
    const byCode = await db.personalityResultTemplate.findUnique({
      where: { code: result.personalityCode },
    });
    if (byCode) return byCode;
  }

  if (result.socialType && result.dominantElement) {
    const byElement = await db.personalityResultTemplate.findFirst({
      where: {
        socialType: String(result.socialType),
        element: String(result.dominantElement).toLowerCase(),
      },
    });
    if (byElement) return byElement;
  }

  if (result.socialType) {
    return db.personalityResultTemplate.findFirst({
      where: { socialType: String(result.socialType) },
    });
  }

  return null;
}

function buildNormalizedInsights(result: AnyRecord, template: unknown) {
  const templateInsights = buildTemplateInsights(template, safeString(result.personalityCode));
  const resultInsightSource =
    result.testType === 'paid'
      ? stripReservedAnalysisFields(result.paidInsights)
      : safeObject(result.freeTeaser);

  return {
    ...templateInsights,
    ...resultInsightSource,
    code: safeString(
      resultInsightSource.code,
      safeString(templateInsights.code, safeString(result.personalityCode)),
    ),
    personalityLabel: safeString(
      resultInsightSource.personalityLabel,
      safeString(templateInsights.personalityLabel),
    ),
  };
}

function buildNormalizedAiInsights(
  result: AnyRecord,
  template: unknown,
  displayAnalysis: ReturnType<typeof buildDisplayAnalysis>,
) {
  if (isNonEmptyObject(result.aiInsights)) {
    return safeObject(result.aiInsights);
  }

  const paidInsights = safeObject(result.paidInsights);
  if (isNonEmptyObject(paidInsights.legacyAiInsights)) {
    return safeObject(paidInsights.legacyAiInsights);
  }

  return buildLegacyPremiumInsights(
    template,
    result.normalizedScores || result.elementScores,
    displayAnalysis.personalityType,
  );
}

function buildDominantLabel(
  result: AnyRecord,
  displayAnalysis: ReturnType<typeof buildDisplayAnalysis>,
  insights: AnyRecord,
) {
  return (
    safeString(insights.personalityLabel)
    || safeString(displayAnalysis.personalityType)
    || [result.socialType, result.dominantElement].filter(Boolean).join(' ')
    || safeString(result.personalityCode, 'Hasil Kepribadian')
  );
}

function extractUserShape(result: AnyRecord) {
  const user = safeObject(result.user);
  const profile = safeObject(user.profile);
  const profileExtra = safeObject(profile.extra);
  const whatsapp =
    safeString(user.phone)
    || safeString(profile.whatsapp)
    || safeString(profileExtra.whatsapp)
    || null;

  return {
    userName: safeString(user.fullName) || null,
    userEmail: safeString(user.email) || null,
    userWhatsapp: whatsapp,
    userProvince: safeString(profile.province) || null,
    userCity: safeString(profile.city) || null,
  };
}

export async function mapTestResultForClient(db: PrismaService, rawResult: AnyRecord | null | undefined) {
  if (!rawResult) return null;

  const result = rawResult as AnyRecord;
  const template = await findTemplateForResult(db, result);
  const displayAnalysis = buildDisplayAnalysis(
    template,
    result.normalizedScores || result.elementScores,
    safeString(result.personalityCode, 'Hasil Kepribadian'),
  );
  const insights = buildNormalizedInsights(result, template);
  const personalInsights = buildNormalizedAiInsights(result, template, displayAnalysis);
  const dominantLabel = buildDominantLabel(result, displayAnalysis, insights);
  const userShape = extractUserShape(result);

  return {
    ...result,
    id: result.id,
    resultId: result.id,
    userId: result.userId,
    testType: result.testType,
    createdAt: result.createdAt,
    completedAt: result.createdAt,
    dominantElement: result.dominantElement || null,
    personalityCode: result.personalityCode || null,
    personalityType: displayAnalysis.personalityType,
    dominantLabel,
    displayAnalysis,
    analysis: {
      dominantElement: result.dominantElement || null,
      personalityType: displayAnalysis.personalityType,
      elementScores: displayAnalysis.elementScores,
      insights,
      personalInsights,
      aiInsights: personalInsights,
    },
    ...userShape,
  };
}
