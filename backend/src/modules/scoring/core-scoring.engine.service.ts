import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  computeStageFourHundredths,
  CORE_ELEMENT_FROM_TES_B_OPTION,
  formatDateToCoreDob,
  getCoreDominantMappingByDigit,
  hundredthsToNumber,
  parseCoreBirthDateToDigits,
  sortCoreElementScoreEntries,
} from './core-scoring.constants';
import {
  CORE_TES_A_KEYS,
  CORE_TES_B_ALLOWED_OPTIONS,
  CORE_TES_B_KEYS,
  CORE_TES_C_ALLOWED_POINTS,
  CORE_TES_C_GROUP_KEYS,
  CoreElementName,
  CoreElementScoreEntry,
  CoreScoringRawInput,
  CoreScoringResult,
  CoreTesAAnswers,
  CoreTesBAnswers,
  CoreTesCAnswers,
} from './core-scoring.types';

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

@Injectable()
export class CoreScoringEngineService {
  constructor(private readonly prisma: PrismaService) {}

  async activeRuleVersion() {
    const active = await this.prisma.scoringRuleSet.findFirst({
      where: { isActive: true },
      orderBy: { version: 'desc' },
    });
    return active?.version || 1;
  }

  formatProfileBirthDate(value: Date) {
    return formatDateToCoreDob(value);
  }

  private assertValidTesA(rawValue: unknown): CoreTesAAnswers {
    if (!isObjectRecord(rawValue)) {
      throw new BadRequestException('tes_a must be an object');
    }

    const normalized = {} as CoreTesAAnswers;
    for (const key of CORE_TES_A_KEYS) {
      if (typeof rawValue[key] !== 'boolean') {
        throw new BadRequestException(`tes_a.${key} must be boolean`);
      }
      normalized[key] = rawValue[key] as boolean;
    }
    return normalized;
  }

  private assertValidTesB(rawValue: unknown): CoreTesBAnswers {
    if (!isObjectRecord(rawValue)) {
      throw new BadRequestException('tes_b must be an object');
    }

    const normalized = {} as CoreTesBAnswers;
    for (const key of CORE_TES_B_KEYS) {
      const answer = String(rawValue[key] || '').trim().toUpperCase();
      if (!CORE_TES_B_ALLOWED_OPTIONS.includes(answer as never)) {
        throw new BadRequestException(`tes_b.${key} must be one of A/B/C/D/E`);
      }
      normalized[key] = answer as CoreTesBAnswers[typeof key];
    }
    return normalized;
  }

  private assertValidTesC(rawValue: unknown, hiddenElement: CoreElementName): CoreTesCAnswers {
    if (!isObjectRecord(rawValue)) {
      throw new BadRequestException('tes_c must be an object');
    }

    const normalized: CoreTesCAnswers = {};
    for (const groupKey of CORE_TES_C_GROUP_KEYS) {
      const expectedElement = this.getGroupElement(groupKey);
      const values = rawValue[groupKey];

      if (expectedElement === hiddenElement) {
        continue;
      }

      if (!Array.isArray(values) || values.length !== 5) {
        throw new BadRequestException(`tes_c.${groupKey} must contain 5 answers`);
      }

      const parsedValues = values.map((item) => Number(item));
      if (parsedValues.some((value) => !CORE_TES_C_ALLOWED_POINTS.includes(value as never))) {
        throw new BadRequestException(`tes_c.${groupKey} contains unsupported likert score`);
      }

      normalized[groupKey] = parsedValues as CoreTesCAnswers[typeof groupKey];
    }

    return normalized;
  }

  private getGroupElement(groupKey: (typeof CORE_TES_C_GROUP_KEYS)[number]) {
    if (groupKey === 'sense_air') return 'Air';
    if (groupKey === 'visual_kayu') return 'Kayu';
    if (groupKey === 'auditori_api') return 'Api';
    if (groupKey === 'reading_logam') return 'Logam';
    return 'Tanah';
  }

  private getModifier(params: {
    naturalType: 'introvert' | 'extrovert' | 'ambivert';
    introvertPoints: number;
    extrovertPoints: number;
  }) {
    const { naturalType, introvertPoints, extrovertPoints } = params;
    if (introvertPoints === extrovertPoints) {
      return '(#)' as const;
    }
    if (naturalType === 'ambivert') {
      return '(-)' as const;
    }
    const dominantTestType = introvertPoints > extrovertPoints ? 'introvert' : 'extrovert';
    return dominantTestType === naturalType ? '(+)' as const : '(-)' as const;
  }

  private scoreTesA(answers: CoreTesAAnswers, naturalType: 'introvert' | 'extrovert' | 'ambivert') {
    let introvertPoints = 0;
    let extrovertPoints = 0;

    const introvertWeightedKeys = new Set(['q1', 'q2', 'q3']);
    for (const key of CORE_TES_A_KEYS) {
      const answer = answers[key];
      if (introvertWeightedKeys.has(key)) {
        if (answer) introvertPoints += 1;
        else extrovertPoints += 1;
        continue;
      }

      if (answer) extrovertPoints += 1;
      else introvertPoints += 1;
    }

    return {
      introvertPoints,
      extrovertPoints,
      modifier: this.getModifier({ naturalType, introvertPoints, extrovertPoints }),
    };
  }

  private scoreTesB(answers: CoreTesBAnswers) {
    const scores: Record<CoreElementName, number> = {
      Tanah: 0,
      Logam: 0,
      Air: 0,
      Kayu: 0,
      Api: 0,
    };

    for (const key of CORE_TES_B_KEYS) {
      const element = CORE_ELEMENT_FROM_TES_B_OPTION[answers[key]];
      const weight = key === 'q5' ? 5 : 1;
      scores[element] += weight;
    }

    return scores;
  }

  private scoreTesC(params: {
    hiddenElement: CoreElementName;
    tesBScoreMap: Record<CoreElementName, number>;
    answers: CoreTesCAnswers;
  }) {
    const entries: CoreElementScoreEntry[] = [];
    for (const groupKey of CORE_TES_C_GROUP_KEYS) {
      const element = this.getGroupElement(groupKey);
      if (element === params.hiddenElement) {
        continue;
      }

      const values = params.answers[groupKey] || [];
      const totalPoinC = values.reduce((sum, value) => sum + Number(value), 0);
      const hundredths = computeStageFourHundredths(totalPoinC, params.tesBScoreMap[element] || 0);
      entries.push({
        elemen: element,
        skorTesB: params.tesBScoreMap[element] || 0,
        totalPoinC,
        hundredths,
        persentase: hundredthsToNumber(hundredths),
      });
    }

    return sortCoreElementScoreEntries(entries);
  }

  async compute(rawInput: CoreScoringRawInput): Promise<CoreScoringResult> {
    const stageOne = parseCoreBirthDateToDigits(rawInput.dob);
    const dominant = getCoreDominantMappingByDigit(stageOne.finalDigit);
    const tesA = this.assertValidTesA(rawInput.tes_a);
    const tesB = this.assertValidTesB(rawInput.tes_b);
    const tesAScore = this.scoreTesA(tesA, dominant.socialType);
    const tesBScoreMap = this.scoreTesB(tesB);
    const tesC = this.assertValidTesC(rawInput.tes_c, dominant.element);
    const tesCEntries = this.scoreTesC({
      hiddenElement: dominant.element,
      tesBScoreMap,
      answers: tesC,
    });

    if (tesCEntries.length < 2) {
      throw new BadRequestException('Tes C must produce at least 2 visible element scores');
    }

    const dominan2 = tesCEntries[0];
    const dominan3 = tesCEntries[1];
    const dominant1Hundredths = Math.max(0, 10_000 - dominan2.hundredths - dominan3.hundredths);

    const breakdown = tesCEntries.slice(2).reduce<Partial<Record<CoreElementName, number>>>((acc, entry) => {
      acc[entry.elemen] = entry.persentase;
      return acc;
    }, {});

    return {
      dominan_1_kode: `${dominant.code}${tesAScore.modifier}`,
      dominan_1_elemen: dominant.element,
      dominan_1_persentase: hundredthsToNumber(dominant1Hundredths),
      dominan_2_elemen: dominan2.elemen,
      dominan_2_persentase: dominan2.persentase,
      dominan_3_elemen: dominan3.elemen,
      dominan_3_persentase: dominan3.persentase,
      breakdown_skor_elemen_lainnya: breakdown,
      audit: {
        dob_formatted: stageOne.formattedDob,
        digit_sum_total: stageOne.initialTotal,
        digit_reduction_trace: stageOne.reductions,
        dominan_1_digit: stageOne.finalDigit,
        dominan_1_kode_awal: dominant.code,
        elemen_dominan_1: dominant.element,
        hidden_group_elemen_tes_c: dominant.element,
        tes_a: {
          poin_introvert: tesAScore.introvertPoints,
          poin_ekstrovert: tesAScore.extrovertPoints,
          modifier: tesAScore.modifier,
        },
        tes_b: tesBScoreMap,
        tes_c: tesCEntries,
      },
    };
  }

  async computeFromProfileBirthDate(input: {
    birthDate: Date;
    tes_a: unknown;
    tes_b: unknown;
    tes_c: unknown;
  }) {
    return this.compute({
      dob: this.formatProfileBirthDate(input.birthDate),
      tes_a: this.assertValidTesA(input.tes_a),
      tes_b: this.assertValidTesB(input.tes_b),
      tes_c: input.tes_c as CoreTesCAnswers,
    });
  }
}
