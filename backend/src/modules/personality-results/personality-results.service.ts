import { Injectable, NotFoundException } from '@nestjs/common';
import { ensureDemoPersonalityTemplates } from 'src/common/demo-frontend-reference';
import {
  CANONICAL_PERSONALITY_TEMPLATE_CODES,
  sortCanonicalPersonalityTemplates,
  stripPersonalityCodeModifier,
} from 'src/common/personality-template-catalog';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PersonalityResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    await ensureDemoPersonalityTemplates(this.prisma);
    const rows = await this.prisma.personalityResultTemplate.findMany({
      where: {
        code: {
          in: [...CANONICAL_PERSONALITY_TEMPLATE_CODES],
        },
      },
    });
    return sortCanonicalPersonalityTemplates(rows);
  }

  async getByCode(code: string) {
    await ensureDemoPersonalityTemplates(this.prisma);
    const normalizedCode = stripPersonalityCodeModifier(code);
    const row =
      await this.prisma.personalityResultTemplate.findUnique({ where: { code } })
      || (normalizedCode && normalizedCode !== code
        ? await this.prisma.personalityResultTemplate.findUnique({ where: { code: normalizedCode } })
        : null);
    if (!row) throw new NotFoundException('Personality code not found');
    return row;
  }

  async update(code: string, body: any) {
    await ensureDemoPersonalityTemplates(this.prisma);
    return this.prisma.personalityResultTemplate.upsert({
      where: { code },
      create: {
        code,
        socialType: body.socialType || 'ambivert',
        element: body.element || 'kayu',
        label: body.label || code,
        color: body.color || '#888888',
        aiAnalysis: body.aiAnalysis || {},
        insights: body.insights || {},
      },
      update: {
        socialType: body.socialType,
        element: body.element,
        label: body.label,
        color: body.color,
        aiAnalysis: body.aiAnalysis || {},
        insights: body.insights || {},
      },
    });
  }
}
