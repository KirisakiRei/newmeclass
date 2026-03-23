import {
  CORE_SCORING_DIVISOR,
  CORE_SCORING_ENGINE,
  CORE_SCORING_ENGINE_VERSION,
  CoreElementKey,
  CoreElementName,
  CoreElementScoreEntry,
  CorePersonalityMapping,
  CoreQuestionCatalogEntry,
  CoreResolvedQuestionRow,
  CoreScoringQuestionMetadata,
  CoreSocialPrefix,
  CoreSocialType,
  CoreTesCGroupKey,
} from './core-scoring.types';

export const CORE_PERSONALITY_DIGIT_MAP: Record<number, CorePersonalityMapping> = {
  1: { digit: 1, code: 'iL', element: 'Logam', socialType: 'introvert' },
  2: { digit: 2, code: 'eA', element: 'Api', socialType: 'extrovert' },
  3: { digit: 3, code: 'iT', element: 'Tanah', socialType: 'introvert' },
  4: { digit: 4, code: 'eT', element: 'Tanah', socialType: 'extrovert' },
  5: { digit: 5, code: 'iA', element: 'Api', socialType: 'introvert' },
  6: { digit: 6, code: 'eK', element: 'Kayu', socialType: 'extrovert' },
  7: { digit: 7, code: 'iK', element: 'Kayu', socialType: 'introvert' },
  8: { digit: 8, code: 'eL', element: 'Logam', socialType: 'extrovert' },
  9: { digit: 9, code: 'aA', element: 'Air', socialType: 'ambivert' },
};

export const CORE_ELEMENT_KEY_BY_NAME: Record<CoreElementName, CoreElementKey> = {
  Tanah: 'TANAH',
  Logam: 'LOGAM',
  Air: 'AIR',
  Kayu: 'KAYU',
  Api: 'API',
};

export const CORE_ELEMENT_NAME_BY_KEY: Record<CoreElementKey, CoreElementName> = {
  TANAH: 'Tanah',
  LOGAM: 'Logam',
  AIR: 'Air',
  KAYU: 'Kayu',
  API: 'Api',
};

export const CORE_ELEMENT_FROM_TES_B_OPTION: Record<string, CoreElementName> = {
  A: 'Tanah',
  B: 'Logam',
  C: 'Air',
  D: 'Kayu',
  E: 'Api',
};

export const CORE_TES_C_GROUP_ELEMENT_MAP: Record<CoreTesCGroupKey, CoreElementName> = {
  sense_air: 'Air',
  visual_kayu: 'Kayu',
  auditori_api: 'Api',
  reading_logam: 'Logam',
  kinestetik_tanah: 'Tanah',
};

export const CORE_ELEMENT_TIE_BREAK_PRIORITY: CoreElementName[] = ['Api', 'Logam', 'Tanah', 'Air', 'Kayu'];

export function toCoreSocialType(prefix: CoreSocialPrefix): CoreSocialType {
  if (prefix === 'i') return 'introvert';
  if (prefix === 'e') return 'extrovert';
  return 'ambivert';
}

export function getCoreDominantMappingByDigit(digit: number): CorePersonalityMapping {
  const mapping = CORE_PERSONALITY_DIGIT_MAP[digit];
  if (!mapping) {
    throw new Error(`Unsupported dominant digit: ${digit}`);
  }
  return mapping;
}

export function parseCoreBirthDateToDigits(rawDob: string) {
  const trimmed = String(rawDob || '').trim();
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (!match) {
    throw new Error('DOB must be formatted as DD-MM-YYYY');
  }

  const [, day, month, year] = match;
  const allDigits = `${day}${month}${year}`.split('').map((value) => Number(value));
  const initialTotal = allDigits.reduce((sum, value) => sum + value, 0);
  const reductions = [initialTotal];
  let reduced = initialTotal;

  while (reduced > 9) {
    reduced = String(reduced)
      .split('')
      .reduce((sum, value) => sum + Number(value), 0);
    reductions.push(reduced);
  }

  return {
    formattedDob: trimmed,
    digits: allDigits,
    initialTotal,
    reductions,
    finalDigit: reduced,
  };
}

export function formatDateToCoreDob(value: Date) {
  const day = String(value.getUTCDate()).padStart(2, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const year = String(value.getUTCFullYear());
  return `${day}-${month}-${year}`;
}

export function truncateToHundredths(rawValue: number) {
  if (!Number.isFinite(rawValue)) return 0;
  return Math.floor(rawValue * 100 + Number.EPSILON);
}

export function hundredthsToNumber(hundredths: number) {
  return Number((hundredths / 100).toFixed(2));
}

export function computeStageFourHundredths(totalPoinC: number, poinTesB: number) {
  const baseHundredths = Math.floor((totalPoinC * 10000) / CORE_SCORING_DIVISOR);
  return baseHundredths + (poinTesB * 100);
}

export function extractCoreScoringMetadata(rawVariants: unknown): CoreScoringQuestionMetadata | null {
  if (!rawVariants || typeof rawVariants !== 'object' || Array.isArray(rawVariants)) return null;
  const root = rawVariants as Record<string, unknown>;
  const rawCore = root.coreScoring;
  if (!rawCore || typeof rawCore !== 'object' || Array.isArray(rawCore)) return null;

  const metadata = rawCore as Record<string, unknown>;
  if (
    metadata.engine !== CORE_SCORING_ENGINE
    || Number(metadata.version) !== CORE_SCORING_ENGINE_VERSION
    || typeof metadata.questionKey !== 'string'
    || typeof metadata.stage !== 'string'
    || typeof metadata.slot !== 'number'
    || typeof metadata.answerType !== 'string'
    || typeof metadata.displayOrder !== 'number'
  ) {
    return null;
  }

  return {
    engine: CORE_SCORING_ENGINE,
    version: CORE_SCORING_ENGINE_VERSION,
    questionKey: metadata.questionKey as CoreScoringQuestionMetadata['questionKey'],
    stage: metadata.stage as CoreScoringQuestionMetadata['stage'],
    slot: metadata.slot,
    answerType: metadata.answerType as CoreScoringQuestionMetadata['answerType'],
    displayOrder: metadata.displayOrder,
    groupKey: typeof metadata.groupKey === 'string' ? (metadata.groupKey as CoreTesCGroupKey) : null,
    groupElement: typeof metadata.groupElement === 'string' ? (metadata.groupElement as CoreElementName) : null,
  };
}

export function isProtectedCoreScoringQuestion(rawVariants: unknown) {
  return !!extractCoreScoringMetadata(rawVariants);
}

export function mergeVariantsPreservingCore(existingVariants: unknown, incomingVariants: unknown) {
  const existing =
    existingVariants && typeof existingVariants === 'object' && !Array.isArray(existingVariants)
      ? { ...(existingVariants as Record<string, unknown>) }
      : {};
  const incoming =
    incomingVariants && typeof incomingVariants === 'object' && !Array.isArray(incomingVariants)
      ? { ...(incomingVariants as Record<string, unknown>) }
      : {};

  delete incoming.coreScoring;
  return { ...existing, ...incoming };
}

export function buildCoreQuestionMetadata(definition: CoreQuestionCatalogEntry): CoreScoringQuestionMetadata {
  return {
    engine: CORE_SCORING_ENGINE,
    version: CORE_SCORING_ENGINE_VERSION,
    questionKey: definition.questionKey,
    stage: definition.stage,
    slot: definition.slot,
    answerType: definition.answerType,
    displayOrder: definition.displayOrder,
    groupKey: definition.groupKey ?? null,
    groupElement: definition.groupElement ?? null,
  };
}

export function sortCoreQuestions(rows: CoreResolvedQuestionRow[]) {
  return [...rows].sort((left, right) => {
    if (left.metadata.displayOrder !== right.metadata.displayOrder) {
      return left.metadata.displayOrder - right.metadata.displayOrder;
    }
    return left.order - right.order;
  });
}

export function sortCoreElementScoreEntries(entries: CoreElementScoreEntry[]) {
  return [...entries].sort((left, right) => {
    if (right.hundredths !== left.hundredths) {
      return right.hundredths - left.hundredths;
    }
    if (right.skorTesB !== left.skorTesB) {
      return right.skorTesB - left.skorTesB;
    }
    return (
      CORE_ELEMENT_TIE_BREAK_PRIORITY.indexOf(left.elemen)
      - CORE_ELEMENT_TIE_BREAK_PRIORITY.indexOf(right.elemen)
    );
  });
}
