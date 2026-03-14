import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestionsService } from '../questions/questions.service';
import { TestResultsService } from '../test-results/test-results.service';
import { SubmitPersonalityTestDto } from './dto/submit-personality-test.dto';

@Injectable()
export class PersonalityTestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questionsService: QuestionsService,
    private readonly resultsService: TestResultsService,
  ) {}

  async getQuestions(testType: string, includePremium: boolean) {
    const all = await this.questionsService.getAll();
    const normalizedType = (testType || '').toLowerCase();
    const mapped = all
      .filter((q) => {
        if (!normalizedType || normalizedType === 'all') return true;
        if (normalizedType.includes('personality')) return true;
        return q.category.toLowerCase() === normalizedType || q.testType.toLowerCase() === normalizedType;
      })
      .map((q) => ({
        id: q.id,
        question: q.text,
        options: q.options.map((o) => o.label),
        isPremium: q.testType === 'paid',
      }));

    return {
      questions: includePremium ? mapped : mapped.filter((q) => !q.isPremium),
      testType,
      totalQuestions: mapped.length,
    };
  }

  async submit(body: SubmitPersonalityTestDto & { includePremium?: boolean; user?: { id?: string } }) {
    const answersArr = Array.isArray(body.answers) ? body.answers : [];
    const answerObj: Record<string, number> = {};
    for (const a of answersArr) {
      answerObj[a.questionId] = Number(a.selectedOption);
    }

    const saved = await this.resultsService.submitNewmeTest(body.userId || body.user?.id || '', {
      testType: body.includePremium ? 'paid' : 'free',
      category: body.testType,
      answers: answerObj,
    });

    return { result: saved.resultId, resultId: saved.resultId, success: true };
  }

  description(personalityType: string) {
    return {
      personalityType,
      summary: 'Deskripsi kepribadian berbasis rules.',
      strengths: ['Adaptif', 'Kolaboratif'],
      careers: ['Product', 'Operations'],
    };
  }

  async myResults(userId: string) {
    const rows = await this.prisma.testResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { results: rows };
  }

  async stats() {
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [total, thisMonth] = await Promise.all([
      this.prisma.testResult.count(),
      this.prisma.testResult.count({ where: { createdAt: { gte: firstDayOfMonth } } }),
    ]);
    return { total, thisMonth };
  }
}
