import { CertificateType } from '@prisma/client';
import { mapCertificateTemplateForClient } from 'src/common/demo-frontend-reference';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { ensureDemoPersonalityTemplates } from 'src/common/demo-frontend-reference';
import {
  buildFallbackPersonalityType,
  buildDisplayAnalysis,
  buildLegacyPremiumInsights,
  buildTemplateInsights,
} from 'src/common/personality-result-shape';
import {
  pickPreferredPersonalityTemplate,
  stripPersonalityCodeModifier,
} from 'src/common/personality-template-catalog';

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
  delete next.coreScoring;
  return next;
};

const isNonEmptyObject = (value: unknown) => Object.keys(safeObject(value)).length > 0;
const buildFallbackCode = (socialType: unknown, dominantElement: unknown, fallback = '') => {
  const social = safeString(socialType).trim().toLowerCase();
  const element = safeString(dominantElement).trim().toUpperCase();
  if (social && element) {
    return `${social[0]}${element[0]}`;
  }
  return fallback;
};

async function findTemplateForResult(db: PrismaService, result: AnyRecord) {
  await ensureDemoPersonalityTemplates(db);
  const preferredCode = stripPersonalityCodeModifier(result.personalityCode);

  for (const candidateCode of [safeString(result.personalityCode), preferredCode]) {
    if (!candidateCode) continue;
    const byCode = await db.personalityResultTemplate.findUnique({
      where: { code: candidateCode },
    });
    if (
      byCode
      && (!result.socialType || byCode.socialType === String(result.socialType))
      && (!result.dominantElement || byCode.element === String(result.dominantElement).toLowerCase())
    ) {
      return byCode;
    }
  }

  if (result.socialType && result.dominantElement) {
    const byElement = await db.personalityResultTemplate.findMany({
      where: {
        socialType: String(result.socialType),
        element: String(result.dominantElement).toLowerCase(),
      },
    });
    const preferredTemplate = pickPreferredPersonalityTemplate(
      byElement,
      preferredCode || safeString(result.personalityCode),
    );
    if (preferredTemplate) return preferredTemplate;
  }

  return null;
}

function buildNormalizedInsights(result: AnyRecord, template: unknown) {
  const fallbackMeta = {
    socialType: result.socialType,
    dominantElement: result.dominantElement,
  };
  const resolvedCode =
    safeString(result.personalityCode)
    || safeString(safeObject(template).code)
    || buildFallbackCode(result.socialType, result.dominantElement, safeString(result.personalityCode));
  const templateInsights = buildTemplateInsights(
    template,
    resolvedCode,
    fallbackMeta,
  );
  const resultInsightSource =
    result.testType === 'paid'
      ? stripReservedAnalysisFields(result.paidInsights)
      : safeObject(result.freeTeaser);
  const sanitizedResultInsightSource = { ...resultInsightSource };
  delete sanitizedResultInsightSource.code;
  delete sanitizedResultInsightSource.personalityLabel;

  return {
    ...templateInsights,
    ...sanitizedResultInsightSource,
    code: safeString(
      safeString(templateInsights.code),
      resolvedCode,
    ),
    personalityLabel: safeString(
      safeString(templateInsights.personalityLabel),
    ),
  };
}

function buildNormalizedAiInsights(
  result: AnyRecord,
  template: unknown,
  displayAnalysis: ReturnType<typeof buildDisplayAnalysis>,
) {
  const hasExactTemplate = !!template;

  if (hasExactTemplate && isNonEmptyObject(result.aiInsights)) {
    return safeObject(result.aiInsights);
  }

  const paidInsights = safeObject(result.paidInsights);
  if (hasExactTemplate && isNonEmptyObject(paidInsights.legacyAiInsights)) {
    return safeObject(paidInsights.legacyAiInsights);
  }

  return buildLegacyPremiumInsights(
    template,
    result.normalizedScores || result.elementScores,
    displayAnalysis.personalityType,
    {
      socialType: result.socialType,
      dominantElement: result.dominantElement,
    },
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
    memberCode:
      safeString(profileExtra.memberCode)
      || safeString(profileExtra.publicCode)
      || safeString(profileExtra.publicId)
      || safeString(user.myReferralCode)
      || null,
    publicId:
      safeString(profileExtra.publicId)
      || safeString(profileExtra.publicCode)
      || safeString(user.myReferralCode)
      || null,
    userWhatsapp: whatsapp,
    userProvince: safeString(profile.province) || null,
    userCity: safeString(profile.city) || null,
  };
}

export async function mapTestResultForClient(db: PrismaService, rawResult: AnyRecord | null | undefined) {
  if (!rawResult) return null;

  const result = rawResult as AnyRecord;
  const template = await findTemplateForResult(db, result);
  const user = safeObject(result.user);
  const userProfileExtra = safeObject(safeObject(user.profile).extra);
  const certType =
    safeString(user.role).toUpperCase() === 'YAYASAN'
    || userProfileExtra.isYayasanLinked === true
      ? CertificateType.YAYASAN
      : CertificateType.INDIVIDU;
  const certificateTemplateRow = await db.certificateTemplate.findUnique({
    where: { certType },
  });
  const certificateTemplate = await mapCertificateTemplateForClient(db, certificateTemplateRow);
  const coreScoring = safeObject(safeObject(result.paidInsights).coreScoring);
  const resolvedPersonalityCode =
    safeString(result.personalityCode)
    || safeString(safeObject(template).code)
    || buildFallbackCode(
      result.socialType,
      result.dominantElement,
      safeString(result.personalityCode),
    );
  const fallbackMeta = {
    socialType: result.socialType,
    dominantElement: result.dominantElement,
  };
  const displayAnalysis = buildDisplayAnalysis(
    template,
    result.normalizedScores || result.elementScores,
    buildFallbackPersonalityType(
      result.socialType,
      result.dominantElement,
      safeString(resolvedPersonalityCode, 'Hasil Kepribadian'),
    ),
    fallbackMeta,
  );
  const insights = buildNormalizedInsights(result, template);
  if (isNonEmptyObject(coreScoring)) {
    insights.code = safeString(result.personalityCode, insights.code);
  }
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
    personalityCode: resolvedPersonalityCode || null,
    personalityType: displayAnalysis.personalityType,
    dominantLabel,
    coreScoring: isNonEmptyObject(coreScoring) ? coreScoring : null,
    displayAnalysis,
    analysis: {
      dominantElement: result.dominantElement || null,
      personalityType: displayAnalysis.personalityType,
      elementScores: displayAnalysis.elementScores,
      insights,
      personalInsights,
      aiInsights: personalInsights,
      coreScoring: isNonEmptyObject(coreScoring) ? coreScoring : null,
    },
    ...userShape,
    template: certificateTemplate,
  };
}
