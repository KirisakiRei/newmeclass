import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapQuestion(row: any) {
    return {
      ...row,
      _id: row.id,
      question: row.text,
      isFree: row.testType === 'free',
      options: Array.isArray(row.options)
        ? row.options.map((option: any) => ({
            ...option,
            _id: option.id,
            text: option.label,
          }))
        : [],
    };
  }

  async getAll() {
    const rows = await this.prisma.question.findMany({
      where: { isActive: true },
      include: { options: { orderBy: { order: 'asc' } } },
      orderBy: { order: 'asc' },
    });
    return rows.map((row) => this.mapQuestion(row));
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
        variants: body.variants || null,
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
    await this.prisma.questionOption.deleteMany({ where: { questionId: id } });
    const updated = await this.prisma.question.update({
      where: { id },
      data: {
        text: body.text || body.question,
        type: body.type,
        category: body.category,
        testType: body.testType,
        socialDimension: body.socialDimension,
        targetElement: body.targetElement,
        isRequired: body.isRequired,
        order: Number(body.order || 0),
        variants: body.variants || null,
        options: {
          create: (body.options || []).map((opt: any, idx: number) => ({
            label: opt.text || opt.label || '',
            value: opt.value || String(idx + 1),
            scores: opt.scores || { kayu: 0, api: 0, tanah: 0, logam: 0, air: 0 },
            order: idx,
          })),
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
    await this.prisma.question.delete({ where: { id } });
    return { message: 'Deleted' };
  }

  async seedQuestions() {
    const count = await this.prisma.question.count();
    if (count > 0) return { message: 'Questions already seeded' };

    const seed = [
      {
        text: 'Saya nyaman memimpin diskusi kelompok.',
        category: 'KAYU',
        socialDimension: 'extrovert',
        testType: 'free',
        options: [
          { text: 'Sangat setuju', value: 'A', scores: { kayu: 5, api: 2, tanah: 1, logam: 0, air: 0 } },
          { text: 'Setuju', value: 'B', scores: { kayu: 4, api: 2, tanah: 1, logam: 0, air: 0 } },
          { text: 'Netral', value: 'C', scores: { kayu: 2, api: 1, tanah: 1, logam: 1, air: 1 } },
          { text: 'Tidak setuju', value: 'D', scores: { kayu: 0, api: 1, tanah: 2, logam: 3, air: 3 } },
        ],
      },
      {
        text: 'Saya lebih suka bekerja dengan struktur yang jelas.',
        category: 'LOGAM',
        socialDimension: 'introvert',
        testType: 'paid',
        options: [
          { text: 'Sangat setuju', value: 'A', scores: { kayu: 1, api: 0, tanah: 2, logam: 5, air: 2 } },
          { text: 'Setuju', value: 'B', scores: { kayu: 1, api: 0, tanah: 2, logam: 4, air: 2 } },
          { text: 'Netral', value: 'C', scores: { kayu: 1, api: 1, tanah: 1, logam: 2, air: 1 } },
          { text: 'Tidak setuju', value: 'D', scores: { kayu: 3, api: 3, tanah: 1, logam: 0, air: 2 } },
        ],
      },
    ];

    for (let i = 0; i < seed.length; i += 1) {
      await this.create({ ...seed[i], type: 'multiple_choice', order: i });
    }

    return { message: 'Questions seeded successfully' };
  }
}
