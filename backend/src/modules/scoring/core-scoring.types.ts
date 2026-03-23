export const CORE_SCORING_ENGINE = 'core_scoring_v1';
export const CORE_SCORING_ENGINE_VERSION = 1;
export const CORE_SCORING_CATEGORY = 'CORE_SCORING_PREMIUM_V1';
export const CORE_SCORING_DIVISOR = 220;

export const CORE_SOCIAL_PREFIXES = ['i', 'e', 'a'] as const;
export type CoreSocialPrefix = (typeof CORE_SOCIAL_PREFIXES)[number];

export const CORE_SOCIAL_TYPES = ['introvert', 'extrovert', 'ambivert'] as const;
export type CoreSocialType = (typeof CORE_SOCIAL_TYPES)[number];

export const CORE_ELEMENT_NAMES = ['Tanah', 'Logam', 'Air', 'Kayu', 'Api'] as const;
export type CoreElementName = (typeof CORE_ELEMENT_NAMES)[number];

export const CORE_ELEMENT_KEYS = ['TANAH', 'LOGAM', 'AIR', 'KAYU', 'API'] as const;
export type CoreElementKey = (typeof CORE_ELEMENT_KEYS)[number];

export const CORE_DOMINANT_CODES = ['iL', 'eA', 'iT', 'eT', 'iA', 'eK', 'iK', 'eL', 'aA'] as const;
export type CoreDominantCode = (typeof CORE_DOMINANT_CODES)[number];

export const CORE_TES_A_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'] as const;
export type CoreTesAQuestionKey = (typeof CORE_TES_A_KEYS)[number];

export const CORE_TES_B_KEYS = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;
export type CoreTesBQuestionKey = (typeof CORE_TES_B_KEYS)[number];

export const CORE_TES_C_GROUP_KEYS = [
  'sense_air',
  'visual_kayu',
  'auditori_api',
  'reading_logam',
  'kinestetik_tanah',
] as const;
export type CoreTesCGroupKey = (typeof CORE_TES_C_GROUP_KEYS)[number];

export const CORE_TES_C_ALLOWED_POINTS = [10, 7, 4, 1] as const;
export type CoreTesCLikertValue = (typeof CORE_TES_C_ALLOWED_POINTS)[number];

export const CORE_TES_B_ALLOWED_OPTIONS = ['A', 'B', 'C', 'D', 'E'] as const;
export type CoreTesBOption = (typeof CORE_TES_B_ALLOWED_OPTIONS)[number];

export type CoreTesAAnswers = Record<CoreTesAQuestionKey, boolean>;
export type CoreTesBAnswers = Record<CoreTesBQuestionKey, CoreTesBOption>;
export type CoreTesCAnswers = Partial<Record<CoreTesCGroupKey, CoreTesCLikertValue[]>>;

export type CoreScoringRawInput = {
  dob: string;
  tes_a: CoreTesAAnswers;
  tes_b: CoreTesBAnswers;
  tes_c: CoreTesCAnswers;
};

export type CorePersonalityMapping = {
  digit: number;
  code: CoreDominantCode;
  element: CoreElementName;
  socialType: CoreSocialType;
};

export type CoreElementScoreEntry = {
  elemen: CoreElementName;
  skorTesB: number;
  totalPoinC: number;
  persentase: number;
  hundredths: number;
};

export type CoreScoringResult = {
  dominan_1_kode: string;
  dominan_1_elemen: CoreElementName;
  dominan_1_persentase: number;
  dominan_2_elemen: CoreElementName;
  dominan_2_persentase: number;
  dominan_3_elemen: CoreElementName;
  dominan_3_persentase: number;
  breakdown_skor_elemen_lainnya: Partial<Record<CoreElementName, number>>;
  audit: {
    dob_formatted: string;
    digit_sum_total: number;
    digit_reduction_trace: number[];
    dominan_1_digit: number;
    dominan_1_kode_awal: CoreDominantCode;
    elemen_dominan_1: CoreElementName;
    hidden_group_elemen_tes_c: CoreElementName;
    tes_a: {
      poin_introvert: number;
      poin_ekstrovert: number;
      modifier: '(+)' | '(-)' | '(#)';
    };
    tes_b: Record<CoreElementName, number>;
    tes_c: CoreElementScoreEntry[];
  };
};

export type CoreQuestionAnswerType = 'boolean' | 'multiple_choice' | 'likert';
export type CoreQuestionStage = 'TES_A' | 'TES_B' | 'TES_C';
export type CoreQuestionKey = `tes_a.${CoreTesAQuestionKey}` | `tes_b.${CoreTesBQuestionKey}` | `tes_c.${CoreTesCGroupKey}.${number}`;

export type CoreScoringQuestionMetadata = {
  engine: typeof CORE_SCORING_ENGINE;
  version: typeof CORE_SCORING_ENGINE_VERSION;
  questionKey: CoreQuestionKey;
  stage: CoreQuestionStage;
  slot: number;
  answerType: CoreQuestionAnswerType;
  displayOrder: number;
  groupKey?: CoreTesCGroupKey | null;
  groupElement?: CoreElementName | null;
};

export type CoreQuestionOptionDefinition = {
  label: string;
  value: string;
};

export type CoreQuestionCatalogEntry = {
  questionKey: CoreQuestionKey;
  text: string;
  stage: CoreQuestionStage;
  slot: number;
  answerType: CoreQuestionAnswerType;
  displayOrder: number;
  groupKey?: CoreTesCGroupKey | null;
  groupElement?: CoreElementName | null;
  options: CoreQuestionOptionDefinition[];
};

export type CoreResolvedQuestionRow = {
  id: string;
  text: string;
  order: number;
  options: Array<{
    id: string;
    label: string;
    value: string;
    order: number;
  }>;
  metadata: CoreScoringQuestionMetadata;
};

export type CoreUnifiedQuestionDto = {
  id: string;
  question: string;
  displayOrder: number;
  answerType: CoreQuestionAnswerType;
  answerPath: CoreQuestionKey;
  options: Array<{
    label: string;
    value: boolean | string | number;
  }>;
};

export type CoreStructuredAnswerRecord = {
  questionId: string;
  questionKey: CoreQuestionKey;
  selectedOption: number;
  answerValue: boolean | string | number;
};
