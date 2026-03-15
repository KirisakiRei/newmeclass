import { Injectable } from '@nestjs/common';
import { Prisma, Role, TestStatus } from '@prisma/client';
import { mapTestResultForClient } from 'src/common/mappers/test-result-client-shapes';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { TestAccessService } from '../test-access/test-access.service';

type SubmitNewmeInput = {
  testType: 'free' | 'paid';
  category?: string;
  answers: Record<string, number>;
};

@Injectable()
export class TestResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
    private readonly testAccessService: TestAccessService,
  ) {}

  async submitNewmeTest(userId: string, input: SubmitNewmeInput) {
    const answers = Object.entries(input.answers || {}).map(([questionId, selectedOption]) => ({
      questionId,
      selectedOption: Number(selectedOption),
    }));

    const computed = await this.scoringService.compute({
      testType: input.testType,
      category: input.category,
      answers,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      const submission = await tx.testSubmission.create({
        data: {
          userId,
          category: input.category || null,
          testType: input.testType,
          status: TestStatus.COMPLETED,
          scoringVersion: computed.scoringVersion,
          questionSnapshot: {
            category: input.category || null,
            answerCount: answers.length,
            answers,
          },
          answers: {
            create: answers,
          },
        },
      });

      const createdResult = await tx.testResult.create({
        data: {
          userId,
          submissionId: submission.id,
          testType: input.testType,
          category: input.category || null,
          scoringVersion: computed.scoringVersion,
          personalityCode: computed.personalityCode,
          dominantElement: computed.dominantElement,
          socialType: computed.socialType,
          elementScores: computed.elementScores,
          normalizedScores: computed.normalizedScores,
          freeTeaser: computed.freeTeaser,
          paidInsights: computed.paidInsights ?? Prisma.JsonNull,
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: input.testType === 'paid'
          ? { paidTestStatus: TestStatus.COMPLETED }
          : { freeTestStatus: TestStatus.COMPLETED },
      });

      return createdResult;
    });

    if (input.testType === 'free' && input.category) {
      await this.testAccessService.recordFreeTest(userId, input.category);
    }

    return {
      resultId: result.id,
      submissionId: result.submissionId,
      personalityCode: result.personalityCode,
      dominantElement: result.dominantElement,
      socialType: result.socialType,
    };
  }

  async getResultById(id: string, user: { sub?: string; role?: Role }) {
    const result = await this.prisma.testResult.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            profile: {
              select: {
                province: true,
                city: true,
                extra: true,
              },
            },
          },
        },
      },
    });

    if (!result) {
      return null;
    }

    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPERADMIN;
    if (!isAdmin && result.userId !== user.sub) {
      return null;
    }

    return mapTestResultForClient(this.prisma, result);
  }

  async checkHasUsedFreeTest(userId: string) {
    const access = await this.prisma.testAccess.findFirst({
      where: { userId, accessType: 'FREE' },
      orderBy: { createdAt: 'desc' },
    });

    return {
      hasUsedFreeTest: !!access,
      latestAccess: access,
    };
  }

  async adminPremiumList() {
    const rows = await this.prisma.testResult.findMany({
      where: { testType: 'paid' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            profile: {
              select: {
                province: true,
                city: true,
                extra: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });

    const latestByUser = new Map<string, any>();
    for (const row of rows) {
      if (!row.userId || latestByUser.has(row.userId)) continue;
      latestByUser.set(row.userId, row);
    }

    return Promise.all(
      Array.from(latestByUser.values()).map((row) => mapTestResultForClient(this.prisma, row)),
    );
  }

  async adminPremiumByUser(userId: string) {
    const row = await this.prisma.testResult.findFirst({
      where: { userId, testType: 'paid' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            profile: {
              select: {
                province: true,
                city: true,
                extra: true,
              },
            },
          },
        },
      },
    });

    return mapTestResultForClient(this.prisma, row);
  }

  async adminStats() {
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [total, totalPaid, premiumResultsThisMonth] = await Promise.all([
      this.prisma.testResult.count(),
      this.prisma.testResult.count({ where: { testType: 'paid' } }),
      this.prisma.testResult.count({
        where: {
          testType: 'paid',
          createdAt: { gte: firstDayOfMonth },
        },
      }),
    ]);

    return {
      total,
      totalPaid,
      totalFree: Math.max(total - totalPaid, 0),
      premiumResultsThisMonth,
    };
  }
}
