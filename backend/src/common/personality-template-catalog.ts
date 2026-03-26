export type PersonalityTemplateSeedRecord = {
  code: string;
  socialType: string;
  element: string;
  label: string;
  color: string;
  aiAnalysis: Record<string, any>;
  insights: Record<string, any>;
};

export const CANONICAL_PERSONALITY_TEMPLATE_CODES = [
  'iL',
  'eA',
  'iT',
  'eT',
  'iA',
  'eK',
  'iK',
  'eL',
  'aA',
] as const;

const CANONICAL_CODE_ORDER = new Map(
  CANONICAL_PERSONALITY_TEMPLATE_CODES.map((code, index) => [code, index]),
);

type SupportedSocialType = 'introvert' | 'extrovert' | 'ambivert';
type SupportedElement = 'kayu' | 'api' | 'tanah' | 'logam' | 'air';
type ElementScoreMap = Record<'KAYU' | 'API' | 'TANAH' | 'LOGAM' | 'AIR', number>;

type PersonalityTemplateDefinition = {
  code: (typeof CANONICAL_PERSONALITY_TEMPLATE_CODES)[number];
  socialType: SupportedSocialType;
  element: SupportedElement;
  label: string;
  color: string;
};

type ElementProfile = {
  key: 'KAYU' | 'API' | 'TANAH' | 'LOGAM' | 'AIR';
  name: string;
  baseLabel: string;
  description: string;
  strengths: string[];
  growthAreas: string[];
  traits: string[];
  careers: string[];
  professionNeed: string;
  scores: ElementScoreMap;
};

type SocialProfile = {
  name: string;
  summaryTone: string;
  strengths: string[];
  growthAreas: string[];
  adaptations: {
    gayaBelajar: string;
    gayaKomunikasi: string;
    gayaKepemimpinan: string;
    gayaKerja: string;
    gayaKonflik: string;
  };
  lifeFocus: string;
  healthFocus: string;
  contributionFocus: string;
  signatureFocus: string;
  charismaFocus: string;
};

const ELEMENT_LABELS: Record<ElementProfile['key'], string> = {
  KAYU: 'Si Kreatif',
  API: 'Si Perasa',
  TANAH: 'Si Stabil',
  LOGAM: 'Si Tegas',
  AIR: 'Si Adaptif',
};

const ELEMENT_PROFILES: Record<SupportedElement, ElementProfile> = {
  kayu: {
    key: 'KAYU',
    name: 'Kayu',
    baseLabel: 'Si Kreatif',
    description: 'Inovatif, visioner, artistik, dan kaya gagasan.',
    strengths: [
      'Mudah melihat peluang baru dan arah pengembangan jangka panjang',
      'Cepat mengubah ide menjadi konsep yang segar dan relevan',
      'Fleksibel saat menghadapi perubahan atau situasi yang belum pasti',
    ],
    growthAreas: [
      'Perlu menjaga fokus agar ide yang banyak tetap berujung eksekusi',
      'Perlu menambahkan struktur kerja agar kreativitas lebih konsisten menghasilkan',
    ],
    traits: ['Inovatif', 'Visioner', 'Artistik', 'Fleksibel', 'Penuh gagasan'],
    careers: ['Desainer', 'Seniman', 'Entrepreneur', 'Arsitek', 'Product Strategist'],
    professionNeed: 'Desain, inovasi produk, branding, strategi kreatif, kewirausahaan',
    scores: { KAYU: 38, API: 18, TANAH: 16, LOGAM: 13, AIR: 15 },
  },
  api: {
    key: 'API',
    name: 'Api',
    baseLabel: 'Si Perasa',
    description: 'Hangat, ekspresif, energik, dan mudah membangun koneksi.',
    strengths: [
      'Mampu membangkitkan energi positif dan antusiasme di sekitar',
      'Peka terhadap suasana emosional dan cepat menangkap kebutuhan relasi',
      'Percaya diri saat menampilkan ide, karya, atau gagasan ke publik',
    ],
    growthAreas: [
      'Perlu menjaga kestabilan emosi agar keputusan tidak terlalu dipengaruhi suasana',
      'Perlu memperkuat konsistensi agar energi tinggi tetap diikuti hasil nyata',
    ],
    traits: ['Hangat', 'Ekspresif', 'Antusias', 'Karismatik', 'Cepat terhubung'],
    careers: ['Sales', 'Marketing', 'Public Speaker', 'Entertainer', 'Community Lead'],
    professionNeed: 'Komunikasi publik, pemasaran, relasi pelanggan, komunitas, presentasi',
    scores: { KAYU: 14, API: 39, TANAH: 15, LOGAM: 12, AIR: 20 },
  },
  tanah: {
    key: 'TANAH',
    name: 'Tanah',
    baseLabel: 'Si Stabil',
    description: 'Praktis, konsisten, dapat diandalkan, dan tenang.',
    strengths: [
      'Menjaga ritme kerja tetap stabil bahkan saat tekanan meningkat',
      'Mampu menjadi penyangga tim melalui konsistensi dan rasa tanggung jawab',
      'Cenderung realistis dan praktis dalam menyelesaikan persoalan',
    ],
    growthAreas: [
      'Perlu lebih terbuka terhadap perubahan agar tidak terlalu nyaman di pola lama',
      'Perlu ruang untuk mempercepat keputusan ketika situasi menuntut gerak cepat',
    ],
    traits: ['Konsisten', 'Praktis', 'Sabar', 'Loyal', 'Menenangkan'],
    careers: ['Manager', 'Administrator', 'Akuntan', 'Project Manager', 'Operator Program'],
    professionNeed: 'Operasional, administrasi, koordinasi program, project management, layanan',
    scores: { KAYU: 16, API: 14, TANAH: 40, LOGAM: 13, AIR: 17 },
  },
  logam: {
    key: 'LOGAM',
    name: 'Logam',
    baseLabel: 'Si Tegas',
    description: 'Disiplin, terstruktur, perfeksionis, dan fokus.',
    strengths: [
      'Menjaga kualitas kerja melalui ketelitian dan standar yang jelas',
      'Kuat dalam analisis, evaluasi, dan penyusunan sistem yang rapi',
      'Objektif saat mengambil keputusan penting atau memeriksa risiko',
    ],
    growthAreas: [
      'Perlu memberi ruang lebih besar untuk spontanitas dan cara kerja orang lain',
      'Perlu menyeimbangkan standar tinggi dengan kecepatan eksekusi',
    ],
    traits: ['Disiplin', 'Tegas', 'Terstruktur', 'Fokus', 'Presisi'],
    careers: ['Lawyer', 'Auditor', 'Engineer', 'Analyst', 'Quality Assurance'],
    professionNeed: 'Audit, kualitas, analisis, engineering, kepatuhan, perencanaan sistem',
    scores: { KAYU: 13, API: 12, TANAH: 16, LOGAM: 41, AIR: 18 },
  },
  air: {
    key: 'AIR',
    name: 'Air',
    baseLabel: 'Si Adaptif',
    description: 'Bijaksana, reflektif, intuitif, dan mudah menyesuaikan diri.',
    strengths: [
      'Cepat membaca konteks dan menyesuaikan pendekatan tanpa kehilangan arah',
      'Kuat dalam memahami orang, situasi, dan dinamika yang tidak selalu terlihat',
      'Mudah menjadi penengah ketika banyak kepentingan perlu diselaraskan',
    ],
    growthAreas: [
      'Perlu ketegasan lebih tinggi agar tidak terlalu lama menimbang semua sisi',
      'Perlu batas pribadi yang jelas agar energi tidak cepat terkuras',
    ],
    traits: ['Bijaksana', 'Intuitif', 'Reflektif', 'Adaptif', 'Luwes'],
    careers: ['Psikolog', 'Peneliti', 'Penulis', 'Mediator', 'UX Researcher'],
    professionNeed: 'Psikologi, riset, konseling, mediasi, penelitian pengguna, komunitas',
    scores: { KAYU: 18, API: 15, TANAH: 20, LOGAM: 12, AIR: 35 },
  },
};

const SOCIAL_PROFILES: Record<SupportedSocialType, SocialProfile> = {
  introvert: {
    name: 'Introvert',
    summaryTone: 'bergerak dari kedalaman pikir, observasi, dan kemandirian yang kuat',
    strengths: [
      'Mampu berpikir mendalam sebelum mengambil keputusan',
      'Nyaman bekerja fokus tanpa perlu banyak distraksi eksternal',
    ],
    growthAreas: [
      'Perlu lebih proaktif menyuarakan ide agar kualitas pikirannya terlihat lebih cepat',
      'Perlu menjaga koneksi komunikasi agar tidak terlalu tertahan di dalam diri',
    ],
    adaptations: {
      gayaBelajar: 'Terstruktur, mendalam, dan memberi ruang refleksi.',
      gayaKomunikasi: 'Tenang, terukur, dan lebih kuat saat substansi sudah matang.',
      gayaKepemimpinan: 'Memberi arah lewat keteladanan, kedalaman analisis, dan kualitas keputusan.',
      gayaKerja: 'Fokus, mandiri, dan kuat saat diberi ruang berpikir.',
      gayaKonflik: 'Menahan reaksi awal, mengamati fakta, lalu menyampaikan poin penting dengan presisi.',
    },
    lifeFocus: 'Fokus, tenang, dan bermakna',
    healthFocus: 'Terjaga lewat ritme yang stabil',
    contributionFocus: 'Kedalaman, kualitas, dan kejernihan',
    signatureFocus: 'Menyusun hal penting sampai matang sebelum ditampilkan',
    charismaFocus: 'Dipercaya karena tenang dan berbobot',
  },
  extrovert: {
    name: 'Extrovert',
    summaryTone: 'bergerak melalui energi, interaksi, dan kemampuan menghidupkan suasana',
    strengths: [
      'Mudah membangun momentum dan mendorong orang lain ikut bergerak',
      'Nyaman mengkomunikasikan ide secara terbuka dan cepat',
    ],
    growthAreas: [
      'Perlu menjaga ritme agar keputusan cepat tetap punya kedalaman yang cukup',
      'Perlu memberi ruang dengar agar energi tinggi tidak menutupi perspektif lain',
    ],
    adaptations: {
      gayaBelajar: 'Interaktif, aktif mencoba, dan cepat menyerap saat ada keterlibatan langsung.',
      gayaKomunikasi: 'Terbuka, langsung, dan mudah menghidupkan percakapan.',
      gayaKepemimpinan: 'Menggerakkan, memberi arah, dan menjaga energi tim tetap naik.',
      gayaKerja: 'Cepat, komunikatif, dan nyaman bekerja kolaboratif.',
      gayaKonflik: 'Cenderung langsung membahas inti masalah dan mencari jalan keluarnya.',
    },
    lifeFocus: 'Aktif, tumbuh, dan berdampak',
    healthFocus: 'Terjaga lewat aktivitas yang terarah',
    contributionFocus: 'Gerak, arah, dan momentum',
    signatureFocus: 'Menghidupkan orang dan proyek agar tidak mandek',
    charismaFocus: 'Diikuti karena energinya terasa nyata',
  },
  ambivert: {
    name: 'Ambivert',
    summaryTone: 'luwes membaca kapan perlu tampil dan kapan perlu menahan diri',
    strengths: [
      'Mudah menyesuaikan gaya interaksi sesuai kebutuhan situasi',
      'Bisa menjadi jembatan antara dinamika cepat dan kebutuhan refleksi yang matang',
    ],
    growthAreas: [
      'Perlu menjaga konsistensi arah agar fleksibilitas tidak berubah menjadi ragu-ragu',
      'Perlu lebih tegas menetapkan prioritas ketika banyak sisi tampak sama penting',
    ],
    adaptations: {
      gayaBelajar: 'Kontekstual, fleksibel, dan mudah menyesuaikan metode yang paling efektif.',
      gayaKomunikasi: 'Empatik, adaptif, dan mampu membaca ritme lawan bicara.',
      gayaKepemimpinan: 'Menjadi fasilitator yang menjaga keseimbangan arah dan hubungan.',
      gayaKerja: 'Luwes, kolaboratif, namun tetap bisa fokus saat dibutuhkan.',
      gayaKonflik: 'Mencari titik temu, menurunkan tensi, lalu menjaga keputusan tetap bergerak.',
    },
    lifeFocus: 'Seimbang, terhubung, dan lentur',
    healthFocus: 'Stabil lewat keseimbangan ritme',
    contributionFocus: 'Jembatan, harmoni, dan penyesuaian yang cerdas',
    signatureFocus: 'Membaca situasi lalu memilih langkah yang paling pas',
    charismaFocus: 'Menenangkan sekaligus memudahkan orang bekerja sama',
  },
};

const CANONICAL_PERSONALITY_TEMPLATE_DEFINITIONS: PersonalityTemplateDefinition[] = [
  { code: 'iL', socialType: 'introvert', element: 'logam', label: 'Si Arsitek Presisi', color: '#64748B' },
  { code: 'eA', socialType: 'extrovert', element: 'api', label: 'Si Pemantik Semangat', color: '#EF4444' },
  { code: 'iT', socialType: 'introvert', element: 'tanah', label: 'Si Penjaga Keseimbangan', color: '#CA8A04' },
  { code: 'eT', socialType: 'extrovert', element: 'tanah', label: 'Si Penggerak Stabilitas', color: '#EAB308' },
  { code: 'iA', socialType: 'introvert', element: 'api', label: 'Si Perasa Mendalam', color: '#DC2626' },
  { code: 'eK', socialType: 'extrovert', element: 'kayu', label: 'Si Penggerak Kreatif', color: '#22C55E' },
  { code: 'iK', socialType: 'introvert', element: 'kayu', label: 'Si Perancang Kreatif', color: '#16A34A' },
  { code: 'eL', socialType: 'extrovert', element: 'logam', label: 'Si Penggerak Presisi', color: '#94A3B8' },
  { code: 'aA', socialType: 'ambivert', element: 'air', label: 'Si Penyesuai Bijak', color: '#3B82F6' },
];

const uniqueList = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const upperFirst = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

function buildElementScores(scores: ElementScoreMap) {
  return Object.entries(scores).reduce<Record<string, { percentage: number; label: string }>>(
    (acc, [key, percentage]) => {
      acc[key] = {
        percentage,
        label: ELEMENT_LABELS[key as keyof typeof ELEMENT_LABELS],
      };
      return acc;
    },
    {},
  );
}

function buildTemplateRecord(definition: PersonalityTemplateDefinition): PersonalityTemplateSeedRecord {
  const elementProfile = ELEMENT_PROFILES[definition.element];
  const socialProfile = SOCIAL_PROFILES[definition.socialType];
  const socialLabel = socialProfile.name;
  const elementLabel = upperFirst(elementProfile.name);
  const combinedStrengths = uniqueList([
    ...elementProfile.strengths,
    ...socialProfile.strengths,
  ]).slice(0, 5);
  const combinedGrowthAreas = uniqueList([
    ...elementProfile.growthAreas,
    ...socialProfile.growthAreas,
  ]).slice(0, 4);
  const combinedCareers = uniqueList(elementProfile.careers);
  const personalitySummary =
    `Anda adalah ${definition.label}, pribadi ${socialLabel.toLowerCase()} dengan dominasi elemen ${elementLabel.toUpperCase()} yang ${socialProfile.summaryTone}. ` +
    `${elementProfile.description} Kombinasi ini membuat Anda menonjol melalui ${elementProfile.traits.slice(0, 3).join(', ').toLowerCase()}, dan kualitas itu sangat berpengaruh pada cara Anda belajar, bekerja, serta mengambil keputusan.`;

  return {
    code: definition.code,
    socialType: definition.socialType,
    element: definition.element,
    label: definition.label,
    color: definition.color,
    aiAnalysis: {
      personalityType: definition.label,
      summary: personalitySummary,
      elementScores: buildElementScores(elementProfile.scores),
      strengths: combinedStrengths,
      areasToImprove: combinedGrowthAreas,
      careerRecommendations: combinedCareers,
    },
    insights: {
      code: definition.code,
      personalityLabel: definition.label,
      elementDescription: [
        `${socialLabel} ${elementLabel}`,
        elementProfile.baseLabel,
        ...elementProfile.traits.slice(0, 3),
      ],
      karakter: uniqueList([
        `${socialLabel} dengan kecenderungan ${elementProfile.baseLabel.toLowerCase()} yang kuat.`,
        elementProfile.description,
        ...combinedStrengths,
      ]).slice(0, 5),
      ciriKhas: elementProfile.traits,
      kekuatanJatidiri: {
        tipe: definition.label.toUpperCase(),
        kehidupan: socialProfile.lifeFocus,
        kesehatan: socialProfile.healthFocus,
        kontribusi: `${socialProfile.contributionFocus} melalui kekuatan ${elementProfile.baseLabel.toLowerCase()}`,
        kekhasan: socialProfile.signatureFocus,
        kharisma: socialProfile.charismaFocus,
      },
      kompilasiAdaptasi: socialProfile.adaptations,
      rekomendasiKarir: combinedCareers.join(', '),
      dibutuhkanPadaProfesi: elementProfile.professionNeed,
    },
  };
}

export function stripPersonalityCodeModifier(rawCode: unknown) {
  const code = typeof rawCode === 'string' ? rawCode.trim() : '';
  return code.replace(/\((\+|-|#)\)\s*$/, '');
}

export function isCanonicalPersonalityTemplateCode(rawCode: unknown) {
  return CANONICAL_CODE_ORDER.has(stripPersonalityCodeModifier(rawCode) as any);
}

export function sortCanonicalPersonalityTemplates<T extends { code: string }>(rows: T[]) {
  return [...rows].sort((left, right) => {
    const leftCode = stripPersonalityCodeModifier(left.code);
    const rightCode = stripPersonalityCodeModifier(right.code);
    const leftIndex = CANONICAL_CODE_ORDER.get(leftCode as any);
    const rightIndex = CANONICAL_CODE_ORDER.get(rightCode as any);

    if (leftIndex !== undefined && rightIndex !== undefined && leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    if (leftIndex !== undefined) return -1;
    if (rightIndex !== undefined) return 1;

    return leftCode.localeCompare(rightCode);
  });
}

export function pickPreferredPersonalityTemplate<T extends { code: string }>(
  rows: T[],
  preferredCode?: string | null,
) {
  const normalizedPreferred = stripPersonalityCodeModifier(preferredCode);
  const sorted = [...rows].sort((left, right) => {
    const leftCode = stripPersonalityCodeModifier(left.code);
    const rightCode = stripPersonalityCodeModifier(right.code);

    if (normalizedPreferred) {
      const leftMatch = leftCode === normalizedPreferred ? 0 : 1;
      const rightMatch = rightCode === normalizedPreferred ? 0 : 1;
      if (leftMatch !== rightMatch) {
        return leftMatch - rightMatch;
      }
    }

    const leftCanonical = isCanonicalPersonalityTemplateCode(leftCode) ? 0 : 1;
    const rightCanonical = isCanonicalPersonalityTemplateCode(rightCode) ? 0 : 1;
    if (leftCanonical !== rightCanonical) {
      return leftCanonical - rightCanonical;
    }

    const leftIndex = CANONICAL_CODE_ORDER.get(leftCode as any) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = CANONICAL_CODE_ORDER.get(rightCode as any) ?? Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return leftCode.localeCompare(rightCode);
  });

  return sorted[0] || null;
}

export const MANUAL_CANONICAL_PERSONALITY_TEMPLATES: PersonalityTemplateSeedRecord[] =
  CANONICAL_PERSONALITY_TEMPLATE_DEFINITIONS.map(buildTemplateRecord);
