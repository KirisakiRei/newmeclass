const ELEMENT_FALLBACK_LABELS: Record<string, string> = {
  KAYU: 'Si Kreatif',
  API: 'Si Perasa',
  TANAH: 'Si Stabil',
  LOGAM: 'Si Tegas',
  AIR: 'Si Adaptif',
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

export function buildDisplayAnalysis(template: unknown, scores: unknown, fallbackLabel = 'Hasil Kepribadian') {
  const templateRow = safeObject(template);
  const aiAnalysis = safeObject(templateRow.aiAnalysis);
  const insights = safeObject(templateRow.insights);

  return {
    personalityType:
      safeString(aiAnalysis.personalityType)
      || safeString(insights.personalityLabel)
      || safeString(templateRow.label)
      || fallbackLabel,
    summary: safeString(aiAnalysis.summary),
    elementScores: buildDisplayElementScores(templateRow, scores),
    strengths: safeArray(aiAnalysis.strengths),
    areasToImprove: safeArray(aiAnalysis.areasToImprove),
    careerRecommendations: safeArray(aiAnalysis.careerRecommendations),
  };
}

export function buildTemplateInsights(template: unknown, fallbackCode?: string) {
  const templateRow = safeObject(template);
  const insights = safeObject(templateRow.insights);

  return {
    ...insights,
    code: safeString(insights.code, safeString(templateRow.code, fallbackCode || '')),
    personalityLabel:
      safeString(insights.personalityLabel)
      || safeString(templateRow.label)
      || null,
  };
}

export function buildLegacyPremiumInsights(template: unknown, scores: unknown, fallbackLabel = 'Hasil Kepribadian') {
  const templateRow = safeObject(template);
  const insights = safeObject(templateRow.insights);
  const displayAnalysis = buildDisplayAnalysis(templateRow, scores, fallbackLabel);
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
