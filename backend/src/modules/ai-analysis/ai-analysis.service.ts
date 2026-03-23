import { Injectable } from '@nestjs/common';
import { mapTestResultForClient } from 'src/common/mappers/test-result-client-shapes';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiAnalysisService {
  constructor(private readonly prisma: PrismaService) {}

  analyze(_userId: string, body: any) {
    return {
      success: true,
      analysis: {
        aiAnalysis: {
          personalityType: body.personalityType || 'Rules Based Personality',
          summary: 'Analisa ini dihasilkan oleh rules engine v1 tanpa LLM eksternal.',
          strengths: ['Analitis', 'Konsisten'],
          areasToImprove: ['Delegasi'],
          careerRecommendations: ['Business Analyst', 'Project Coordinator'],
          elementScores: body.elementScores || { KAYU: 20, API: 20, TANAH: 20, LOGAM: 20, AIR: 20 },
        },
      },
    };
  }

  async myAnalyses(userId: string) {
    const rows = await this.prisma.testResult.findMany({ where: { userId, testType: 'paid' }, orderBy: { createdAt: 'desc' } });
    return { analyses: rows.map((r) => ({ id: r.id, analysis: r.aiInsights })) };
  }

  async latest(userId: string) {
    const latest = await this.prisma.testResult.findFirst({ where: { userId, testType: 'paid' }, orderBy: { createdAt: 'desc' } });
    if (!latest) {
      return { success: false, message: 'No analysis found' };
    }
    const hydrated = await this.prisma.testResult.findUnique({
      where: { id: latest.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            myReferralCode: true,
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

    return {
      success: true,
      analysis: await mapTestResultForClient(this.prisma, hydrated),
    };
  }
}
