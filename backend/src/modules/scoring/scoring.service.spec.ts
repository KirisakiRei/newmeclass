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
        findFirst: jest.fn().mockResolvedValue({ code: 'eK', label: 'Si Kreatif', aiAnalysis: {}, insights: {} }),
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
});
