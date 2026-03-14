import { Injectable } from '@nestjs/common';
import { ensureDemoPersonalityTemplates } from 'src/common/demo-frontend-reference';
import {
  buildDisplayAnalysis,
  buildLegacyPremiumInsights,
  buildTemplateInsights,
} from 'src/common/personality-result-shape';
import { PrismaService } from '../prisma/prisma.service';

type ScoringInput = {
  testType: 'free' | 'paid';
  category?: string;
  answers: Array<{ questionId: string; selectedOption: number }>;
};

@Injectable()
export class ScoringService {
  constructor(private readonly prisma: PrismaService) {}

  private normalize(scores: Record<string, number>) {
    const total = Object.values(scores).reduce((acc, value) => acc + value, 0) || 1;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(scores)) out[k] = Math.round((v / total) * 100);
    return out;
  }

  async activeRuleVersion() {
    const active = await this.prisma.scoringRuleSet.findFirst({ where: { isActive: true }, orderBy: { version: 'desc' } });
    return active?.version || 1;
  }

  async compute(input: ScoringInput) {
    await ensureDemoPersonalityTemplates(this.prisma);

    const answers = input.answers || [];
    const questionIds = answers.map((a) => a.questionId);
    const questions = await this.prisma.question.findMany({ where: { id: { in: questionIds } }, include: { options: true } });

    const raw = { KAYU: 0, API: 0, TANAH: 0, LOGAM: 0, AIR: 0 };
    const social = { extrovert: 0, introvert: 0, ambivert: 0 };

    for (const ans of answers) {
      const q = questions.find((row) => row.id === ans.questionId);
      if (!q) continue;
      const opt = q.options.find((o) => o.order === Number(ans.selectedOption));
      const scoreMap = (opt?.scores as any) || {};
      raw.KAYU += Number(scoreMap.kayu || 0);
      raw.API += Number(scoreMap.api || 0);
      raw.TANAH += Number(scoreMap.tanah || 0);
      raw.LOGAM += Number(scoreMap.logam || 0);
      raw.AIR += Number(scoreMap.air || 0);

      if (q.socialDimension && q.socialDimension !== 'none' && social[q.socialDimension as keyof typeof social] !== undefined) {
        const socialPoint = Math.max(1, 5 - Number(ans.selectedOption || 0));
        social[q.socialDimension as keyof typeof social] += socialPoint;
      }
    }

    const dominantElement = Object.entries(raw).sort((a, b) => b[1] - a[1])[0]?.[0] || 'KAYU';
    const socialType = Object.entries(social).sort((a, b) => b[1] - a[1])[0]?.[0] || 'ambivert';

    const template = await this.prisma.personalityResultTemplate.findFirst({ where: { socialType, element: dominantElement.toLowerCase() } })
      || await this.prisma.personalityResultTemplate.findFirst({ where: { socialType } });

    const personalityCode = template?.code || `${socialType[0]}${dominantElement[0]}`;

    const normalized = this.normalize(raw);
    const basicInsights = buildTemplateInsights(template, personalityCode);
    const displayAnalysis = buildDisplayAnalysis(
      template,
      normalized,
      template?.label || `Tipe ${dominantElement}`,
    );
    const legacyPremiumInsights = buildLegacyPremiumInsights(
      template,
      normalized,
      displayAnalysis.personalityType,
    );

    const paidInsights = input.testType === 'paid'
      ? {
          ...basicInsights,
          aiAnalysis: displayAnalysis,
          legacyAiInsights: legacyPremiumInsights,
        }
      : null;

    return {
      scoringVersion: await this.activeRuleVersion(),
      dominantElement,
      socialType,
      personalityCode,
      elementScores: raw,
      normalizedScores: normalized,
      freeTeaser: basicInsights,
      paidInsights,
    };
  }
}
