import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  extractCoreScoringMetadata,
  isProtectedCoreScoringQuestion,
  mergeVariantsPreservingCore,
} from '../scoring/core-scoring.constants';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_QUESTION_CATALOG } from './default-question-catalog';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapQuestion(row: any) {
    const coreScoringMetadata = extractCoreScoringMetadata(row.variants);
    return {
      ...row,
      _id: row.id,
      question: row.text,
      isFree: row.testType === 'free',
      isCoreScoringProtected: !!coreScoringMetadata,
      coreScoringMetadata,
      options: Array.isArray(row.options)
        ? row.options.map((option: any) => ({
            ...option,
            _id: option.id,
            text: option.label,
          }))
        : [],
    };
  }

  private sanitizeAdminVariants(variants: any): Prisma.InputJsonValue {
    const base =
      variants && typeof variants === 'object' && !Array.isArray(variants)
        ? { ...(variants as Record<string, unknown>) }
        : {};
    delete base.coreScoring;
    return base as Prisma.InputJsonValue;
  }

  async getAll() {
    const rows = await this.prisma.question.findMany({
      where: { isActive: true },
      include: { options: { orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    });
    return rows.map((row) => this.mapQuestion(row));
  }

  async getPublicQuestions() {
    const rows = await this.getAll();
    return rows.filter((row) => !isProtectedCoreScoringQuestion(row.variants));
  }

  async getCategories() {
    const rows = await this.prisma.question.findMany({ select: { category: true }, distinct: ['category'] });
    return rows.map((r) => r.category);
  }

  async create(body: any) {
    const options = Array.isArray(body.options) ? body.options : [];
    const created = await this.prisma.question.create({
      data: {
        text: body.text || body.question || '',
        type: body.type || 'multiple_choice',
        category: body.category || 'KAYU',
        testType: body.testType || 'free',
        socialDimension: body.socialDimension || 'none',
        targetElement: body.targetElement || null,
        isRequired: body.isRequired !== false,
        isActive: true,
        order: Number(body.order || 0),
        variants: this.sanitizeAdminVariants(body.variants),
        options: {
          create: options.map((opt: any, idx: number) => ({
            label: opt.text || opt.label || '',
            value: opt.value || String(idx + 1),
            scores: opt.scores || { kayu: 0, api: 0, tanah: 0, logam: 0, air: 0 },
            order: idx,
          })),
        },
      },
      include: { options: true },
    });
    return this.mapQuestion(created);
  }

  async getById(id: string) {
    const row = await this.prisma.question.findUnique({ where: { id }, include: { options: true } });
    return row ? this.mapQuestion(row) : null;
  }

  async update(id: string, body: any) {
    const existing = await this.prisma.question.findUnique({
      where: { id },
      include: { options: { orderBy: { order: 'asc' } } },
    });
    await this.prisma.questionOption.deleteMany({ where: { questionId: id } });
    const coreMetadata = extractCoreScoringMetadata(existing?.variants);

    const updatedOptions = coreMetadata
      ? (existing?.options || []).map((option: any, idx: number) => ({
          label: body?.options?.[idx]?.text || body?.options?.[idx]?.label || option.label || '',
          value: option.value,
          scores: option.scores || {},
          order: option.order,
        }))
      : (body.options || []).map((opt: any, idx: number) => ({
          label: opt.text || opt.label || '',
          value: opt.value || String(idx + 1),
          scores: opt.scores || { kayu: 0, api: 0, tanah: 0, logam: 0, air: 0 },
          order: idx,
        }));

    const updated = await this.prisma.question.update({
      where: { id },
      data: {
        text: body.text || body.question || existing?.text,
        type: coreMetadata ? existing?.type : body.type,
        category: coreMetadata ? existing?.category : body.category,
        testType: coreMetadata ? existing?.testType : body.testType,
        socialDimension: coreMetadata ? existing?.socialDimension : body.socialDimension,
        targetElement: coreMetadata ? existing?.targetElement : body.targetElement,
        isRequired: coreMetadata ? existing?.isRequired : body.isRequired,
        isActive: coreMetadata ? (body.isActive ?? existing?.isActive) : body.isActive,
        order: coreMetadata ? Number(body.order ?? existing?.order ?? 0) : Number(body.order || 0),
        variants: coreMetadata
          ? ({
              ...mergeVariantsPreservingCore(existing?.variants, body.variants),
              coreScoring: coreMetadata,
            } as Prisma.InputJsonValue)
          : this.sanitizeAdminVariants(body.variants),
        options: {
          create: updatedOptions,
        },
      },
      include: { options: true },
    });
    return this.mapQuestion(updated);
  }

  async reorder(orders: any[]) {
    for (const item of orders || []) {
      const id = item.id || item._id;
      await this.prisma.question.update({ where: { id }, data: { order: Number(item.order || 0) } });
    }
    return { message: 'Order updated' };
  }

  async remove(id: string) {
    const existing = await this.prisma.question.findUnique({
      where: { id },
      select: { variants: true },
    });

    if (isProtectedCoreScoringQuestion(existing?.variants)) {
      throw new BadRequestException('Pertanyaan core scoring premium tidak dapat dihapus dari dashboard admin');
    }

    await this.prisma.question.delete({ where: { id } });
    return { message: 'Deleted' };
  }

  async seedQuestions() {
    const existingQuestions = await this.prisma.question.findMany({
      select: { text: true, testType: true, order: true },
      orderBy: { order: 'asc' },
    });
    const existingQuestionKeys = new Set(
      existingQuestions.map((question) => `${question.text}::${question.testType}`),
    );
    let nextQuestionOrder =
      existingQuestions.reduce((maxOrder, question) => Math.max(maxOrder, question.order), -1) + 1;
    let seededCount = 0;

    for (const question of DEFAULT_QUESTION_CATALOG) {
      const questionKey = `${question.text}::${question.testType}`;
      if (existingQuestionKeys.has(questionKey)) {
        continue;
      }

      await this.create({
        ...question,
        type: 'multiple_choice',
        order: nextQuestionOrder,
      });

      nextQuestionOrder += 1;
      seededCount += 1;
    }

    if (seededCount === 0) {
      return { message: 'Default questions already available' };
    }

    return { message: `Added ${seededCount} default questions successfully` };
  }
}
