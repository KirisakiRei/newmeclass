const ELEMENT_FALLBACK_LABELS: Record<string, string> = {
  KAYU: 'Si Kreatif',
  API: 'Si Perasa',
  TANAH: 'Si Stabil',
  LOGAM: 'Si Tegas',
  AIR: 'Si Adaptif',
};

const SOCIAL_FALLBACK_LABELS: Record<string, string> = {
  extrovert: 'Extrovert',
  introvert: 'Introvert',
  ambivert: 'Ambivert',
};

const safeObject = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};

const safeArray = (value: unknown) => (Array.isArray(value) ? value : []);

const safeString = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const formatLabel = (input: string) =>
  input
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());

const toUpper = (value: unknown) => safeString(value).toUpperCase();

export function buildFallbackPersonalityType(
  socialType: unknown,
  dominantElement: unknown,
  fallbackLabel = 'Hasil Kepribadian',
) {
  const socialKey = safeString(socialType).toLowerCase();
  const elementKey = toUpper(dominantElement);
  const socialLabel = SOCIAL_FALLBACK_LABELS[socialKey];
  const elementLabel = ELEMENT_FALLBACK_LABELS[elementKey];

  if (socialLabel && elementLabel) {
    return `${socialLabel} ${elementLabel}`;
  }

  if (socialLabel && elementKey) {
    return `${socialLabel} ${formatLabel(elementKey.toLowerCase())}`;
  }

  if (elementLabel) {
    return elementLabel;
  }

  if (elementKey) {
    return formatLabel(elementKey.toLowerCase());
  }

  return fallbackLabel;
}

export function buildFallbackSummary(
  socialType: unknown,
  dominantElement: unknown,
  fallbackLabel = 'Hasil Kepribadian',
) {
  const socialKey = safeString(socialType).toLowerCase();
  const socialLabel = SOCIAL_FALLBACK_LABELS[socialKey] || 'Kepribadian';
  const elementKey = toUpper(dominantElement);
  const elementLabel =
    ELEMENT_FALLBACK_LABELS[elementKey]
    || (elementKey ? formatLabel(elementKey.toLowerCase()) : fallbackLabel);

  return `Hasil Anda saat ini menunjukkan kecenderungan ${socialLabel} dengan elemen dominan ${elementLabel}. Template narasi detail untuk kombinasi ini belum disiapkan, tetapi skor elemen utamanya sudah dihitung sesuai jawaban yang Anda berikan.`;
}

export function normalizeElementScoreMap(value: unknown) {
  const source = safeObject(value);
  return Object.entries(source).reduce<Record<string, number>>((acc, [key, rawValue]) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return acc;
    acc[String(key).trim().toUpperCase()] = parsed;
    return acc;
  }, {});
}

export function buildDisplayElementScores(template: unknown, scores: unknown) {
  const normalizedScores = normalizeElementScoreMap(scores);
  const templateScores = safeObject(safeObject(template).aiAnalysis).elementScores;
  const templateScoreMap = safeObject(templateScores);

  return Object.entries(normalizedScores).reduce<Record<string, { percentage: number; label: string }>>(
    (acc, [key, percentage]) => {
      const label =
        safeString(safeObject(templateScoreMap[key]).label)
        || ELEMENT_FALLBACK_LABELS[key]
        || formatLabel(key.toLowerCase());

      acc[key] = {
        percentage,
        label,
      };
      return acc;
    },
    {},
  );
}

export function buildDisplayAnalysis(
  template: unknown,
  scores: unknown,
  fallbackLabel = 'Hasil Kepribadian',
  fallbackMeta?: { socialType?: unknown; dominantElement?: unknown },
) {
  const templateRow = safeObject(template);
  const aiAnalysis = safeObject(templateRow.aiAnalysis);
  const insights = safeObject(templateRow.insights);
  const fallbackPersonalityType = buildFallbackPersonalityType(
    fallbackMeta?.socialType,
    fallbackMeta?.dominantElement,
    fallbackLabel,
  );

  return {
    personalityType:
      safeString(aiAnalysis.personalityType)
      || safeString(insights.personalityLabel)
      || safeString(templateRow.label)
      || fallbackPersonalityType,
    summary:
      safeString(aiAnalysis.summary)
      || buildFallbackSummary(fallbackMeta?.socialType, fallbackMeta?.dominantElement, fallbackPersonalityType),
    elementScores: buildDisplayElementScores(templateRow, scores),
    strengths: safeArray(aiAnalysis.strengths),
    areasToImprove: safeArray(aiAnalysis.areasToImprove),
    careerRecommendations: safeArray(aiAnalysis.careerRecommendations),
  };
}

export function buildTemplateInsights(
  template: unknown,
  fallbackCode?: string,
  fallbackMeta?: { socialType?: unknown; dominantElement?: unknown },
) {
  const templateRow = safeObject(template);
  const insights = safeObject(templateRow.insights);
  const fallbackPersonalityLabel = buildFallbackPersonalityType(
    fallbackMeta?.socialType,
    fallbackMeta?.dominantElement,
  );

  return {
    ...insights,
    code: safeString(insights.code, safeString(templateRow.code, fallbackCode || '')),
    personalityLabel:
      safeString(insights.personalityLabel)
      || safeString(templateRow.label)
      || fallbackPersonalityLabel
      || null,
  };
}

export function buildLegacyPremiumInsights(
  template: unknown,
  scores: unknown,
  fallbackLabel = 'Hasil Kepribadian',
  fallbackMeta?: { socialType?: unknown; dominantElement?: unknown },
) {
  const templateRow = safeObject(template);
  const insights = safeObject(templateRow.insights);
  const displayAnalysis = buildDisplayAnalysis(templateRow, scores, fallbackLabel, fallbackMeta);
  const kompilasiAdaptasi = safeObject(insights.kompilasiAdaptasi);

  return {
    ringkasanKepribadian: displayAnalysis.summary,
    kekuatanUtama: displayAnalysis.strengths,
    areasPengembanganDiri: displayAnalysis.areasToImprove,
    rekomendasiKarirSpesifik: displayAnalysis.careerRecommendations.map((career) => ({
      bidang: career,
      alasan:
        safeString(insights.dibutuhkanPadaProfesi)
        || `Bidang ini selaras dengan karakter ${displayAnalysis.personalityType}.`,
      roleContoh: [career],
    })),
    strategiPengembanganDiri: Object.entries(kompilasiAdaptasi)
      .map(([area, description]) => ({
        area: formatLabel(area),
        langkahKonkret: safeString(description) ? [String(description)] : [],
      }))
      .filter((item) => item.langkahKonkret.length > 0),
    tipsPraktis: safeArray(insights.karakter),
    motivationalMessage: displayAnalysis.summary,
  };
}
