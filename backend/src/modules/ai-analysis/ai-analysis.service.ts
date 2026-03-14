import { Injectable } from '@nestjs/common';
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
    return {
      success: true,
      analysis: {
        id: latest.id,
        resultId: latest.id,
        testType: latest.testType,
        dominantElement: latest.dominantElement,
        personalityCode: latest.personalityCode,
        aiAnalysis: latest.aiInsights || {
          personalityType: latest.personalityCode,
          summary: 'Rules-based premium analysis',
          strengths: ['Resilience'],
          areasToImprove: ['Focus'],
          careerRecommendations: ['Strategist'],
          elementScores: latest.normalizedScores,
        },
      },
    };
  }
}
