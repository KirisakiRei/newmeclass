jest.mock('src/common/demo-frontend-reference', () => ({
  ensureDemoPersonalityTemplates: jest.fn().mockResolvedValue(undefined),
}));

import { ScoringService } from './scoring.service';

describe('ScoringService', () => {
  it('computes deterministic dominant element and normalized scores', async () => {
    const prismaMock: any = {
      question: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'q1',
            socialDimension: 'extrovert',
            options: [
              { order: 0, scores: { kayu: 5, api: 0, tanah: 0, logam: 0, air: 0 } },
              { order: 1, scores: { kayu: 1, api: 4, tanah: 0, logam: 0, air: 0 } },
            ],
          },
        ]),
      },
      scoringRuleSet: {
        findFirst: jest.fn().mockResolvedValue({ version: 2 }),
      },
      personalityResultTemplate: {
        findMany: jest.fn().mockResolvedValue([{ code: 'eK', label: 'Si Kreatif', aiAnalysis: {}, insights: {} }]),
        create: jest.fn(),
      },
    };

    const service = new ScoringService(prismaMock);
    const result = await service.compute({
      testType: 'free',
      answers: [{ questionId: 'q1', selectedOption: 0 }],
    });

    expect(result.scoringVersion).toBe(2);
    expect(result.dominantElement).toBe('KAYU');
    expect(result.normalizedScores.KAYU).toBeGreaterThan(0);
    expect(result.personalityCode).toBe('eK');
  });

  it('does not fall back to a mismatched social-only template when element template is missing', async () => {
    const prismaMock: any = {
      question: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'q1',
            socialDimension: 'introvert',
            options: [
              { order: 0, scores: { kayu: 0, api: 0, tanah: 0, logam: 5, air: 0 } },
            ],
          },
        ]),
      },
      scoringRuleSet: {
        findFirst: jest.fn().mockResolvedValue({ version: 3 }),
      },
      personalityResultTemplate: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
    };

    const service = new ScoringService(prismaMock);
    const result = await service.compute({
      testType: 'paid',
      answers: [{ questionId: 'q1', selectedOption: 0 }],
    });

    expect(result.dominantElement).toBe('LOGAM');
    expect(result.socialType).toBe('introvert');
    expect(result.personalityCode).toBe('iL');
    expect(result.paidInsights?.aiAnalysis?.summary).toContain('elemen dominan');
    expect(result.paidInsights?.personalityLabel).toBe('Introvert Si Tegas');
  });

  it('prefers canonical aA template when legacy aAi data is also present', async () => {
    const prismaMock: any = {
      question: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'q1',
            socialDimension: 'ambivert',
            options: [
              { order: 0, scores: { kayu: 0, api: 0, tanah: 0, logam: 0, air: 5 } },
            ],
          },
        ]),
      },
      scoringRuleSet: {
        findFirst: jest.fn().mockResolvedValue({ version: 4 }),
      },
      personalityResultTemplate: {
        findMany: jest.fn().mockResolvedValue([
          { code: 'aAi', label: 'Legacy Air', aiAnalysis: {}, insights: {} },
          { code: 'aA', label: 'Canonical Air', aiAnalysis: {}, insights: {} },
        ]),
        create: jest.fn(),
      },
    };

    const service = new ScoringService(prismaMock);
    const result = await service.compute({
      testType: 'free',
      answers: [{ questionId: 'q1', selectedOption: 0 }],
    });

    expect(result.socialType).toBe('ambivert');
    expect(result.dominantElement).toBe('AIR');
    expect(result.personalityCode).toBe('aA');
  });
});
