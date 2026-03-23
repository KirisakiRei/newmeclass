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

export const MANUAL_CANONICAL_PERSONALITY_TEMPLATES: PersonalityTemplateSeedRecord[] = [
  {
    code: 'iL',
    label: 'Si Arsitek Presisi',
    socialType: 'introvert',
    element: 'logam',
    color: '#607D8B',
    aiAnalysis: {
      personalityType: 'Si Arsitek Presisi',
      summary: 'Anda adalah pribadi dengan dominasi elemen LOGAM yang tenang dan presisi, seorang Arsitek Presisi yang bekerja melalui struktur, akurasi, dan kejernihan berpikir. Introvert-Logam menghadirkan sosok yang tidak perlu banyak bicara untuk menunjukkan kualitasnya. Anda membangun standar, sistem, dan keputusan matang yang sering menjadi fondasi keberhasilan jangka panjang.',
      elementScores: {
        KAYU: { percentage: 13, label: 'Si Kreatif' },
        API: { percentage: 12, label: 'Si Perasa' },
        TANAH: { percentage: 16, label: 'Si Stabil' },
        LOGAM: { percentage: 41, label: 'Si Presisi' },
        AIR: { percentage: 18, label: 'Si Adaptif' },
      },
      strengths: [
        'Ketelitian tinggi yang menjaga kualitas tetap konsisten di level terbaik',
        'Kemampuan analitis mendalam untuk melihat celah, risiko, dan perbaikan sistem',
        'Kemandirian kerja yang kuat, nyaman menuntaskan tugas kompleks tanpa banyak supervisi',
        'Objektivitas yang membantu Anda mengambil keputusan logis saat situasi menekan',
        'Disiplin pribadi yang membuat proses dan hasil kerja Anda dapat dipercaya',
      ],
      areasToImprove: [
        'Ekspresi ide perlu lebih proaktif agar kualitas pemikiran Anda lebih cepat dimanfaatkan tim',
        'Perfeksionisme yang terlalu tinggi bisa memperlambat eksekusi',
        'Fleksibilitas terhadap cara kerja orang lain agar kolaborasi terasa lebih ringan',
        'Kehangatan komunikasi perlu lebih dimunculkan supaya tidak terkesan terlalu kaku',
      ],
      careerRecommendations: [
        'System Analyst',
        'Auditor',
        'Quality Assurance',
        'Data Analyst',
        'Research Strategist',
        'Financial Planner',
        'Technical Writer',
      ],
    },
    insights: {
      personalityLabel: 'Si Arsitek Presisi',
      elementDescription: [
        'Tenang & Terukur',
        'Presisi & Analitis',
        'Kualitas Di Atas Segalanya',
        'Mandiri & Sistematis',
        'Penjaga Standar',
      ],
      karakter: [
        'Berpikir hati-hati dan cenderung menimbang sebelum bertindak',
        'Sangat menghargai kejelasan, struktur, dan kualitas hasil',
        'Mandiri dalam bekerja dan tidak suka proses yang berantakan',
        'Objektif dan lebih nyaman menyampaikan sesuatu secara terukur',
        'Menjadi penjaga mutu yang sering melihat detail penting yang orang lain lewatkan',
      ],
      ciriKhas: ['Presisi', 'Tenang', 'Sistematis', 'Objektif', 'Standar Tinggi'],
      kekuatanJatidiri: {
        tipe: 'Si ARSITEK PRESISI',
        kehidupan: 'Teratur, Fokus & Berkualitas',
        kesehatan: 'Tenang & Terkontrol',
        kontribusi: 'Struktur, Kualitas & Ketepatan',
        kekhasan: 'Menyusun Sesuatu Sampai Rapi dan Siap Pakai',
        kharisma: 'Dipercaya karena Konsistensi dan Mutu',
      },
      kompilasiAdaptasi: {
        gayaBelajar: 'Terstruktur, Mendalam & Berbasis Logika',
        gayaKomunikasi: 'Ringkas, Tepat & Penuh Pertimbangan',
        gayaKepemimpinan: 'Standar Tinggi & Keteladanan Kualitas',
        gayaKerja: 'Teliti, Mandiri & Sistematis',
        gayaKonflik: 'Analitis, Tenang & Berbasis Fakta',
      },
      rekomendasiKarir: 'System Analyst, Auditor, Quality Assurance, Data Analyst, Research Strategist, Financial Planner, Technical Writer',
      dibutuhkanPadaProfesi: 'Teknologi, Keuangan, Audit, Riset, Quality Control, Dokumentasi Teknis',
    },
  },
  {
    code: 'eL',
    label: 'Si Penggerak Presisi',
    socialType: 'extrovert',
    element: 'logam',
    color: '#78909C',
    aiAnalysis: {
      personalityType: 'Si Penggerak Presisi',
      summary: 'Anda adalah pribadi dengan dominasi elemen LOGAM yang kuat dan ekspresif, seorang Penggerak Presisi yang mampu membawa standar tinggi ke ruang kolaborasi. Extrovert-Logam menghasilkan sosok yang tegas, jelas, dan cepat mengorganisasi orang maupun proses. Anda tidak hanya ingin segala sesuatu berjalan rapi, Anda juga mampu menggerakkan orang lain untuk ikut menjaga kualitas itu.',
      elementScores: {
        KAYU: { percentage: 15, label: 'Si Kreatif' },
        API: { percentage: 18, label: 'Si Perasa' },
        TANAH: { percentage: 16, label: 'Si Stabil' },
        LOGAM: { percentage: 39, label: 'Si Presisi' },
        AIR: { percentage: 12, label: 'Si Adaptif' },
      },
      strengths: [
        'Tegas dan cepat memberi arah saat tim membutuhkan kejelasan',
        'Mampu mengubah ide menjadi sistem kerja yang terukur dan bisa dijalankan',
        'Keberanian menyampaikan standar membuat mutu kerja tim terjaga',
        'Kemampuan presentasi dan komunikasi yang jelas memudahkan koordinasi lintas orang',
        'Organisasi yang rapi membantu proyek bergerak lebih efisien dan minim kesalahan',
      ],
      areasToImprove: [
        'Nada komunikasi perlu dijaga agar ketegasan tidak terasa terlalu keras',
        'Kesabaran terhadap proses belajar orang lain perlu diperluas',
        'Perfeksionisme bisa membuat delegasi terasa sulit',
        'Ruang untuk spontanitas dan kreativitas tim perlu lebih dibuka',
      ],
      careerRecommendations: [
        'Project Manager',
        'Operations Lead',
        'Business Analyst',
        'Compliance Manager',
        'Consultant',
        'Trainer',
        'Process Improvement Specialist',
      ],
    },
    insights: {
      personalityLabel: 'Si Penggerak Presisi',
      elementDescription: [
        'Tegas & Terarah',
        'Sistematis & Efisien',
        'Penggerak Standar',
        'Komunikatif & Jelas',
        'Pemimpin Proses',
      ],
      karakter: [
        'Menyukai kejelasan target, aturan main, dan indikator keberhasilan',
        'Berani mengoreksi proses yang tidak efektif atau tidak rapi',
        'Cepat mengorganisasi orang dan sumber daya agar tujuan tercapai',
        'Komunikatif namun tetap terukur dan berorientasi hasil',
        'Menjadi motor yang mendorong kualitas tim naik secara konsisten',
      ],
      ciriKhas: ['Tegas', 'Rapi', 'Terstruktur', 'Jelas', 'Pengarah'],
      kekuatanJatidiri: {
        tipe: 'Si PENGGERAK PRESISI',
        kehidupan: 'Tertata, Efisien & Berkualitas',
        kesehatan: 'Aktif & Terdisiplin',
        kontribusi: 'Arah, Standar & Eksekusi Berkualitas',
        kekhasan: 'Membuat Sistem Bekerja dengan Jelas',
        kharisma: 'Diikuti karena Tegas dan Kompeten',
      },
      kompilasiAdaptasi: {
        gayaBelajar: 'Terstruktur, Interaktif & Berbasis Kerangka',
        gayaKomunikasi: 'Jelas, Tegas & Langsung ke Inti',
        gayaKepemimpinan: 'Directive, Standard-Driven & Organizing',
        gayaKerja: 'Cepat, Rapi & Berorientasi Hasil',
        gayaKonflik: 'Konfrontatif Secukupnya, Fokus pada Solusi',
      },
      rekomendasiKarir: 'Project Manager, Operations Lead, Business Analyst, Compliance Manager, Consultant, Trainer, Process Improvement Specialist',
      dibutuhkanPadaProfesi: 'Operasional, Manajemen Proyek, Konsultasi, Kepatuhan, Analisis Bisnis, Peningkatan Proses',
    },
  },
  {
    code: 'aA',
    label: 'Si Penyesuai Bijak',
    socialType: 'ambivert',
    element: 'air',
    color: '#2196F3',
    aiAnalysis: {
      personalityType: 'Si Penyesuai Bijak',
      summary: 'Anda adalah pribadi dengan dominasi elemen AIR yang mengalir, seorang Penyesuai Bijak yang memiliki kecerdasan intuitif dan kemampuan adaptasi luar biasa. Ambivert-Air menghasilkan sosok yang luwes dalam membaca situasi: tahu kapan perlu tampil, kapan perlu mundur, dan bagaimana menjaga keseimbangan antar banyak kepentingan sekaligus.',
      elementScores: {
        KAYU: { percentage: 18, label: 'Si Kreatif' },
        API: { percentage: 15, label: 'Si Perasa' },
        TANAH: { percentage: 20, label: 'Si Stabil' },
        LOGAM: { percentage: 12, label: 'Si Tegas' },
        AIR: { percentage: 35, label: 'Si Adaptif' },
      },
      strengths: [
        'Adaptabilitas tinggi membuat Anda cepat menyesuaikan diri di lingkungan yang berubah',
        'Intuisi sosial yang baik membantu membaca dinamika orang dan situasi',
        'Mudah menjadi penengah karena mampu melihat banyak sudut pandang',
        'Fleksibilitas berpikir mendorong solusi yang kreatif namun tetap realistis',
        'Kehadiran yang menenangkan membuat orang merasa lebih mudah bekerja sama',
      ],
      areasToImprove: [
        'Ketegasan perlu dijaga agar tidak terlalu mudah mengikuti arus sekitar',
        'Batas pribadi perlu lebih jelas agar energi tidak cepat habis',
        'Konsistensi pada prioritas utama perlu diperkuat',
        'Keputusan penting kadang perlu diambil lebih cepat tanpa menunggu semua pihak nyaman',
      ],
      careerRecommendations: [
        'Diplomat',
        'Mediator',
        'Konselor',
        'Psikolog',
        'UX Researcher',
        'Community Builder',
        'International Relations',
      ],
    },
    insights: {
      personalityLabel: 'Si Penyesuai Bijak',
      elementDescription: [
        'Adaptif & Mengalir',
        'Intuitif & Bijak',
        'Mediator Alami',
        'Empatik Mendalam',
        'Penghubung Perspektif',
      ],
      karakter: [
        'Nyaman bergerak di berbagai situasi dan tidak kaku menghadapi perubahan',
        'Peka membaca kebutuhan orang lain dan konteks sekitar',
        'Mampu menjembatani perbedaan tanpa cepat menghakimi',
        'Fleksibel dalam berpikir namun tetap mampu melihat makna yang lebih dalam',
        'Cenderung menjadi penenang dan penyelaras ketika situasi memanas',
      ],
      ciriKhas: ['Adaptif', 'Bijak', 'Mediator', 'Intuitif', 'Luwes'],
      kekuatanJatidiri: {
        tipe: 'Si PENYESUAI BIJAK',
        kehidupan: 'Mengalir, Terhubung & Bermakna',
        kesehatan: 'Lentur & Seimbang',
        kontribusi: 'Jembatan, Harmoni & Perspektif',
        kekhasan: 'Membaca Situasi Sebelum Banyak Orang Menyadarinya',
        kharisma: 'Menenangkan Sekaligus Menyatukan',
      },
      kompilasiAdaptasi: {
        gayaBelajar: 'Kontekstual, Fleksibel & Multi-Modal',
        gayaKomunikasi: 'Empatik, Adaptif & Diplomatis',
        gayaKepemimpinan: 'Facilitative & Consensus-Building',
        gayaKerja: 'Luwes, Kolaboratif & Context-Sensitive',
        gayaKonflik: 'Mediasi, Menenangkan dan Mencari Win-Win',
      },
      rekomendasiKarir: 'Diplomat, Mediator, Konselor, Psikolog, UX Researcher, Community Builder, Hubungan Internasional',
      dibutuhkanPadaProfesi: 'Psikologi, Komunitas, Hubungan Internasional, Penelitian Pengguna, Konsultasi, Mediasi',
    },
  },
];
