import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildCoreQuestionMetadata,
  extractCoreScoringMetadata,
  formatDateToCoreDob,
  getCoreDominantMappingByDigit,
  parseCoreBirthDateToDigits,
  sortCoreQuestions,
} from './core-scoring.constants';
import { CORE_SCORING_QUESTION_CATALOG } from './core-scoring-question-catalog';
import {
  CORE_SCORING_CATEGORY,
  CORE_TES_A_KEYS,
  CORE_TES_B_KEYS,
  CORE_TES_C_GROUP_KEYS,
  CoreQuestionKey,
  CoreResolvedQuestionRow,
  CoreStructuredAnswerRecord,
  CoreTesAAnswers,
  CoreTesBAnswers,
  CoreTesCAnswers,
  CoreUnifiedQuestionDto,
} from './core-scoring.types';

type CoreQuestionDbRow = {
  id: string;
  text: string;
  order: number;
  variants: Prisma.JsonValue | null;
  options: Array<{
    id: string;
    label: string;
    value: string;
    order: number;
  }>;
};

@Injectable()
export class CoreScoringCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private buildQuestionOrder(displayOrder: number) {
    return 10_000 + displayOrder;
  }

  private getResolvedRows(rawRows: CoreQuestionDbRow[]) {
    const resolved: CoreResolvedQuestionRow[] = [];
    for (const row of rawRows) {
      const metadata = extractCoreScoringMetadata(row.variants);
      if (!metadata) continue;
      resolved.push({
        id: row.id,
        text: row.text,
        order: row.order,
        options: [...row.options].sort((left, right) => left.order - right.order),
        metadata,
      });
    }
    return sortCoreQuestions(resolved);
  }

  private async fetchCoreQuestionRows() {
    const rows = await this.prisma.question.findMany({
      where: {
        testType: 'paid',
        category: CORE_SCORING_CATEGORY,
      },
      include: {
        options: {
          select: {
            id: true,
            label: true,
            value: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { order: 'asc' },
    });

    return rows as CoreQuestionDbRow[];
  }

  private toPersistedVariants(existingVariants: Prisma.JsonValue | null, metadata: ReturnType<typeof buildCoreQuestionMetadata>) {
    const existing =
      existingVariants && typeof existingVariants === 'object' && !Array.isArray(existingVariants)
        ? { ...(existingVariants as Record<string, unknown>) }
        : {};
    return {
      ...existing,
      coreScoring: metadata,
    } as Prisma.InputJsonValue;
  }

  async ensureQuestionCatalog() {
    const existingRows = await this.fetchCoreQuestionRows();
    const existingByQuestionKey = new Map(
      existingRows.flatMap((row) => {
        const metadata = extractCoreScoringMetadata(row.variants);
        return metadata ? [[metadata.questionKey, row] as const] : [];
      }),
    );

    for (const definition of CORE_SCORING_QUESTION_CATALOG) {
      const metadata = buildCoreQuestionMetadata(definition);
      const existingRow = existingByQuestionKey.get(definition.questionKey);

      if (!existingRow) {
        await this.prisma.question.create({
          data: {
            text: definition.text,
            type: 'multiple_choice',
            category: CORE_SCORING_CATEGORY,
            testType: 'paid',
            socialDimension: 'none',
            targetElement: definition.groupElement || null,
            isRequired: true,
            isActive: true,
            order: this.buildQuestionOrder(definition.displayOrder),
            variants: {
              coreScoring: metadata,
            },
            options: {
              create: definition.options.map((option, index) => ({
                label: option.label,
                value: option.value,
                scores: {},
                order: index,
              })),
            },
          },
        });
        continue;
      }

      const sortedExistingOptions = [...existingRow.options].sort((left, right) => left.order - right.order);
      const normalizedOptions = definition.options.map((option, index) => {
        const currentOption = sortedExistingOptions[index];
        return {
          label: currentOption?.label || option.label,
          value: option.value,
          scores: {},
          order: index,
        };
      });

      const currentOptionValues = sortedExistingOptions.map((option) => `${option.order}:${option.value}`).join('|');
      const expectedOptionValues = normalizedOptions.map((option) => `${option.order}:${option.value}`).join('|');
      const shouldResetOptions = currentOptionValues !== expectedOptionValues || sortedExistingOptions.length !== normalizedOptions.length;

      await this.prisma.question.update({
        where: { id: existingRow.id },
        data: {
          type: 'multiple_choice',
          category: CORE_SCORING_CATEGORY,
          testType: 'paid',
          socialDimension: 'none',
          targetElement: definition.groupElement || null,
          isRequired: true,
          order: this.buildQuestionOrder(definition.displayOrder),
          variants: this.toPersistedVariants(existingRow.variants, metadata),
          ...(shouldResetOptions
            ? {
                options: {
                  deleteMany: {},
                  create: normalizedOptions,
                },
              }
            : {}),
        },
      });
    }

    return this.getAllCoreQuestions();
  }

  async getAllCoreQuestions() {
    const rows = await this.fetchCoreQuestionRows();
    const resolvedRows = this.getResolvedRows(rows);

    if (resolvedRows.length !== CORE_SCORING_QUESTION_CATALOG.length) {
      throw new InternalServerErrorException('Core scoring catalog is incomplete');
    }

    return resolvedRows;
  }

  async getRuntimeQuestionsForBirthDate(birthDate: Date) {
    await this.ensureQuestionCatalog();

    const dob = formatDateToCoreDob(birthDate);
    const stageOne = parseCoreBirthDateToDigits(dob);
    const dominant = getCoreDominantMappingByDigit(stageOne.finalDigit);
    const hiddenElement = dominant.element;
    const rows = await this.getAllCoreQuestions();
    const visibleRows = rows.filter((row) => row.metadata.groupElement !== hiddenElement);

    const questions: CoreUnifiedQuestionDto[] = visibleRows.map((row) => ({
      id: row.id,
      question: row.text,
      displayOrder: row.metadata.displayOrder,
      answerType: row.metadata.answerType,
      answerPath: row.metadata.questionKey,
      options: row.options.map((option) => ({
        label: option.label,
        value: this.toClientOptionValue(row.metadata.answerType, option.value),
      })),
    }));

    return {
      engine: 'core_scoring_v1',
      version: 1,
      totalQuestions: questions.length,
      hiddenTesCElement: hiddenElement,
      dominant1Preview: {
        digit: stageOne.finalDigit,
        kode: dominant.code,
        elemen: dominant.element,
      },
      questions,
    };
  }

  private toClientOptionValue(answerType: CoreUnifiedQuestionDto['answerType'], rawValue: string) {
    if (answerType === 'boolean') {
      return rawValue === 'Y';
    }
    if (answerType === 'likert') {
      return Number(rawValue);
    }
    return rawValue;
  }

  private getOptionOrderByValue(row: CoreResolvedQuestionRow, rawValue: string) {
    const matchedOption = row.options.find((option) => option.value === rawValue);
    if (!matchedOption) {
      throw new BadRequestException(`Invalid answer option for ${row.metadata.questionKey}`);
    }
    return matchedOption.order;
  }

  private normalizeTesCGroupValue(values: number[]) {
    return values.map((value) => String(Number(value)));
  }

  async buildStructuredAnswerRecords(input: {
    birthDate: Date;
    tesA: CoreTesAAnswers;
    tesB: CoreTesBAnswers;
    tesC: CoreTesCAnswers;
  }) {
    await this.ensureQuestionCatalog();
    const dob = formatDateToCoreDob(input.birthDate);
    const stageOne = parseCoreBirthDateToDigits(dob);
    const dominant = getCoreDominantMappingByDigit(stageOne.finalDigit);
    const hiddenElement = dominant.element;
    const rows = await this.getAllCoreQuestions();

    const rowsByKey = new Map<string, CoreResolvedQuestionRow>(rows.map((row) => [row.metadata.questionKey, row]));
    const records: CoreStructuredAnswerRecord[] = [];

    for (const key of CORE_TES_A_KEYS) {
      const value = input.tesA[key];
      const questionKey = `tes_a.${key}` as CoreQuestionKey;
      const row = rowsByKey.get(questionKey);
      if (!row) {
        throw new InternalServerErrorException(`Missing question catalog row for ${questionKey}`);
      }
      const optionValue = value ? 'Y' : 'N';
      records.push({
        questionId: row.id,
        questionKey,
        selectedOption: this.getOptionOrderByValue(row, optionValue),
        answerValue: value,
      });
    }

    for (const key of CORE_TES_B_KEYS) {
      const value = input.tesB[key];
      const questionKey = `tes_b.${key}` as CoreQuestionKey;
      const row = rowsByKey.get(questionKey);
      if (!row) {
        throw new InternalServerErrorException(`Missing question catalog row for ${questionKey}`);
      }
      records.push({
        questionId: row.id,
        questionKey,
        selectedOption: this.getOptionOrderByValue(row, value),
        answerValue: value,
      });
    }

    for (const groupKey of CORE_TES_C_GROUP_KEYS) {
      const rawValues = input.tesC[groupKey];
      if (!rawValues) continue;
      const values = Array.isArray(rawValues) ? rawValues : [];
      const firstRow = rows.find((row) => row.metadata.groupKey === groupKey);
      if (!firstRow) {
        throw new BadRequestException(`Unknown Tes C group: ${groupKey}`);
      }

      if (firstRow.metadata.groupElement === hiddenElement) {
        continue;
      }

      const normalizedValues = this.normalizeTesCGroupValue(values);
      normalizedValues.forEach((value, index) => {
        const questionKey = `tes_c.${groupKey}.${index + 1}` as CoreQuestionKey;
        const row = rowsByKey.get(questionKey);
        if (!row) {
          throw new InternalServerErrorException(`Missing question catalog row for ${questionKey}`);
        }
        records.push({
          questionId: row.id,
          questionKey,
          selectedOption: this.getOptionOrderByValue(row, value),
          answerValue: Number(value),
        });
      });
    }

    return {
      hiddenElement,
      records: records.sort((left, right) => left.questionKey.localeCompare(right.questionKey)),
    };
  }
}
