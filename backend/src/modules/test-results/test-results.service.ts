import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role, TestStatus } from '@prisma/client';
import { mapTestResultForClient } from 'src/common/mappers/test-result-client-shapes';
import { buildPaginatedResult, resolvePagination } from 'src/common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CoreScoringCatalogService } from '../scoring/core-scoring-catalog.service';
import { CoreScoringEngineService } from '../scoring/core-scoring.engine.service';
import { ScoringService } from '../scoring/scoring.service';
import { CORE_SCORING_CATEGORY, CoreElementName, CoreTesAAnswers, CoreTesBAnswers, CoreTesCAnswers } from '../scoring/core-scoring.types';
import { CORE_ELEMENT_KEY_BY_NAME } from '../scoring/core-scoring.constants';
import { TestAccessService } from '../test-access/test-access.service';

type SubmitNewmeInput = {
  testType: 'free' | 'paid';
  category?: string;
  answers: Record<string, number>;
};

type SubmitCorePremiumInput = {
  tes_a: CoreTesAAnswers;
  tes_b: CoreTesBAnswers;
  tes_c: CoreTesCAnswers;
};

@Injectable()
export class TestResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
    private readonly coreScoringEngineService: CoreScoringEngineService,
    private readonly coreScoringCatalogService: CoreScoringCatalogService,
    private readonly testAccessService: TestAccessService,
  ) {}

  private getSocialTypeFromPersonalityCode(personalityCode: string) {
    const prefix = String(personalityCode || '').trim().charAt(0).toLowerCase();
    if (prefix === 'i') return 'introvert';
    if (prefix === 'e') return 'extrovert';
    return 'ambivert';
  }

  private buildCoreElementScoreMap(result: {
    dominan_1_elemen: CoreElementName;
    dominan_1_persentase: number;
    dominan_2_elemen: CoreElementName;
    dominan_2_persentase: number;
    dominan_3_elemen: CoreElementName;
    dominan_3_persentase: number;
    breakdown_skor_elemen_lainnya: Partial<Record<CoreElementName, number>>;
  }) {
    const scores: Record<string, number> = {
      TANAH: 0,
      LOGAM: 0,
      AIR: 0,
      KAYU: 0,
      API: 0,
    };

    scores[CORE_ELEMENT_KEY_BY_NAME[result.dominan_1_elemen]] = result.dominan_1_persentase;
    scores[CORE_ELEMENT_KEY_BY_NAME[result.dominan_2_elemen]] = result.dominan_2_persentase;
    scores[CORE_ELEMENT_KEY_BY_NAME[result.dominan_3_elemen]] = result.dominan_3_persentase;

    for (const [elementName, value] of Object.entries(result.breakdown_skor_elemen_lainnya || {})) {
      scores[CORE_ELEMENT_KEY_BY_NAME[elementName as CoreElementName]] = Number(value || 0);
    }

    return scores;
  }

  async submitCorePremiumTest(userId: string, input: SubmitCorePremiumInput) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        profile: {
          select: {
            birthDate: true,
          },
        },
      },
    });

    const birthDate = user?.profile?.birthDate;
    if (!birthDate) {
      throw new BadRequestException('Tanggal lahir profil belum tersedia untuk perhitungan core premium');
    }

    const scoringVersion = await this.coreScoringEngineService.activeRuleVersion();
    const computed = await this.coreScoringEngineService.compute({
      dob: this.coreScoringEngineService.formatProfileBirthDate(birthDate),
      tes_a: input.tes_a,
      tes_b: input.tes_b,
      tes_c: input.tes_c,
    });
    const mappedAnswers = await this.coreScoringCatalogService.buildStructuredAnswerRecords({
      birthDate,
      tesA: input.tes_a,
      tesB: input.tes_b,
      tesC: input.tes_c,
    });
    const elementScores = this.buildCoreElementScoreMap(computed);

    const result = await this.prisma.$transaction(async (tx) => {
      const submission = await tx.testSubmission.create({
        data: {
          userId,
          category: CORE_SCORING_CATEGORY,
          testType: 'paid',
          status: TestStatus.COMPLETED,
          scoringVersion,
          questionSnapshot: {
            engine: 'core_scoring_v1',
            category: CORE_SCORING_CATEGORY,
            answerCount: mappedAnswers.records.length,
            hiddenTesCElement: mappedAnswers.hiddenElement,
            dobResolvedFromProfile: this.coreScoringEngineService.formatProfileBirthDate(birthDate),
            structuredAnswers: input,
            persistedAnswerMap: mappedAnswers.records.map((record) => ({
              questionId: record.questionId,
              questionKey: record.questionKey,
              selectedOption: record.selectedOption,
              answerValue: record.answerValue,
            })),
          },
          answers: {
            create: mappedAnswers.records.map((record) => ({
              questionId: record.questionId,
              selectedOption: record.selectedOption,
            })),
          },
        },
      });

      const createdResult = await tx.testResult.create({
        data: {
          userId,
          submissionId: submission.id,
          testType: 'paid',
          category: CORE_SCORING_CATEGORY,
          scoringVersion,
          personalityCode: computed.dominan_1_kode,
          dominantElement: CORE_ELEMENT_KEY_BY_NAME[computed.dominan_1_elemen],
          socialType: this.getSocialTypeFromPersonalityCode(computed.dominan_1_kode),
          elementScores,
          normalizedScores: elementScores,
          freeTeaser: Prisma.JsonNull,
          paidInsights: {
            coreScoring: computed,
          },
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: {
          paidTestStatus: TestStatus.COMPLETED,
        },
      });

      return createdResult;
    });

    return {
      result: result.id,
      resultId: result.id,
      submissionId: result.submissionId,
      personalityCode: result.personalityCode,
      dominantElement: result.dominantElement,
      socialType: result.socialType,
      coreScoring: computed,
      success: true,
    };
  }

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
            myReferralCode: true,
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
      throw new NotFoundException('Result not found');
    }

    const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPERADMIN;
    if (!isAdmin && result.userId !== user.sub) {
      throw new ForbiddenException('Insufficient role');
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

  async adminPremiumList(query: { page?: string | number; pageSize?: string | number; search?: string } = {}) {
    const rows = await this.prisma.testResult.findMany({
      where: { testType: 'paid' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            myReferralCode: true,
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

    const mapped = await Promise.all(
      Array.from(latestByUser.values()).map((row) => mapTestResultForClient(this.prisma, row)),
    );
    const normalizedSearch = String(query.search || '').trim().toLowerCase();
    const filtered = normalizedSearch
      ? mapped.filter((row) => `${row?.userName || ''} ${row?.userEmail || ''}`.toLowerCase().includes(normalizedSearch))
      : mapped;
    const { page, pageSize } = resolvePagination(query, { pageSize: 10, maxPageSize: 100 });
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    return buildPaginatedResult(filtered.slice(start, start + pageSize), total, page, pageSize);
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
            myReferralCode: true,
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
