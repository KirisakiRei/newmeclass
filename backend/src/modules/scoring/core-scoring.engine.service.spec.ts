import {
  parseCoreBirthDateToDigits,
  sortCoreElementScoreEntries,
} from './core-scoring.constants';
import { CoreScoringEngineService } from './core-scoring.engine.service';

function createService() {
  return new CoreScoringEngineService({
    scoringRuleSet: {
      findFirst: jest.fn().mockResolvedValue({ version: 1 }),
    },
  } as any);
}

function buildBaseTesB() {
  return {
    q1: 'A',
    q2: 'B',
    q3: 'C',
    q4: 'D',
    q5: 'E',
  } as const;
}

describe('CoreScoringEngineService', () => {
  it('matches the exact golden scenario from the product spec', async () => {
    const service = createService();
    const result = await service.compute({
      dob: '29-09-2003',
      tes_a: {
        q1: true,
        q2: true,
        q3: true,
        q4: false,
        q5: false,
        q6: false,
      },
      tes_b: {
        q1: 'B',
        q2: 'D',
        q3: 'C',
        q4: 'C',
        q5: 'E',
      },
      tes_c: {
        sense_air: [1, 4, 4, 4, 1],
        visual_kayu: [10, 7, 7, 10, 7],
        auditori_api: [4, 7, 7, 1, 7],
        reading_logam: [10, 4, 7, 4, 7],
        kinestetik_tanah: [1, 7, 7, 4, 1],
      },
    });

    expect(result).toMatchObject({
      dominan_1_kode: 'iK(+)',
      dominan_1_elemen: 'Kayu',
      dominan_1_persentase: 67.65,
      dominan_2_elemen: 'Api',
      dominan_2_persentase: 16.81,
      dominan_3_elemen: 'Logam',
      dominan_3_persentase: 15.54,
      breakdown_skor_elemen_lainnya: {
        Tanah: 9.09,
        Air: 8.36,
      },
    });
    expect(result.audit.digit_reduction_trace).toEqual([25, 7]);
    expect(result.audit.hidden_group_elemen_tes_c).toBe('Kayu');
  });

  it('treats ambivert ties as (#)', async () => {
    const service = createService();
    const result = await service.compute({
      dob: '09-09-1998',
      tes_a: {
        q1: true,
        q2: true,
        q3: false,
        q4: true,
        q5: true,
        q6: false,
      },
      tes_b: buildBaseTesB(),
      tes_c: {
        visual_kayu: [10, 7, 4, 1, 10],
        auditori_api: [7, 7, 4, 1, 10],
        reading_logam: [10, 10, 7, 4, 1],
        kinestetik_tanah: [4, 4, 4, 4, 4],
      },
    });

    expect(result.dominan_1_kode).toBe('aA(#)');
    expect(result.dominan_1_elemen).toBe('Air');
  });

  it('treats ambivert non-ties as (-)', async () => {
    const service = createService();
    const result = await service.compute({
      dob: '09-09-1998',
      tes_a: {
        q1: true,
        q2: true,
        q3: true,
        q4: false,
        q5: false,
        q6: false,
      },
      tes_b: buildBaseTesB(),
      tes_c: {
        visual_kayu: [10, 7, 4, 1, 10],
        auditori_api: [7, 7, 4, 1, 10],
        reading_logam: [10, 10, 7, 4, 1],
        kinestetik_tanah: [4, 4, 4, 4, 4],
      },
    });

    expect(result.dominan_1_kode).toBe('aA(-)');
  });

  it('sorts equal percentages by higher Tes B score and then fixed fallback order', () => {
    const sorted = sortCoreElementScoreEntries([
      {
        elemen: 'Tanah',
        skorTesB: 2,
        totalPoinC: 20,
        hundredths: 1200,
        persentase: 12,
      },
      {
        elemen: 'Air',
        skorTesB: 4,
        totalPoinC: 20,
        hundredths: 1200,
        persentase: 12,
      },
      {
        elemen: 'Api',
        skorTesB: 4,
        totalPoinC: 20,
        hundredths: 1200,
        persentase: 12,
      },
    ]);

    expect(sorted.map((entry) => entry.elemen)).toEqual(['Api', 'Air', 'Tanah']);
  });

  it('reduces DOB digits until a single dominant number remains', () => {
    expect(parseCoreBirthDateToDigits('29-09-2003')).toMatchObject({
      initialTotal: 25,
      reductions: [25, 7],
      finalDigit: 7,
    });
  });
});
