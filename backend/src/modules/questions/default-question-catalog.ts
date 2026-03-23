type QuestionSeed = {
  text: string;
  category: string;
  socialDimension: string;
  testType: 'free' | 'paid';
  targetElement?: string | null;
  variants?: Record<string, string>;
  options: Array<{
    text: string;
    value: string;
    scores: Record<string, number>;
  }>;
};

const likert = (targetElement: 'KAYU' | 'API' | 'TANAH' | 'LOGAM' | 'AIR', intensity = 1) => [
  { text: 'Sangat Setuju', value: 'SS', scores: { kayu: 0, api: 0, tanah: 0, logam: 0, air: 0, [targetElement.toLowerCase()]: 5 * intensity } },
  { text: 'Setuju', value: 'S', scores: { kayu: 0, api: 0, tanah: 0, logam: 0, air: 0, [targetElement.toLowerCase()]: 4 * intensity } },
  { text: 'Netral', value: 'N', scores: { kayu: 1, api: 1, tanah: 1, logam: 1, air: 1 } },
  { text: 'Tidak Setuju', value: 'TS', scores: { kayu: 0, api: 0, tanah: 0, logam: 0, air: 0, [targetElement.toLowerCase()]: 2 * intensity } },
  { text: 'Sangat Tidak Setuju', value: 'STS', scores: { kayu: 0, api: 0, tanah: 0, logam: 0, air: 0, [targetElement.toLowerCase()]: 1 * intensity } },
];

export const DEFAULT_QUESTION_CATALOG: QuestionSeed[] = [
  {
    text: 'Saya mudah memulai ide atau proyek baru tanpa harus disuruh.',
    category: 'KAYU',
    socialDimension: 'extrovert',
    testType: 'free',
    targetElement: 'KAYU',
    options: likert('KAYU'),
  },
  {
    text: 'Saya menikmati berbicara dan membangun hubungan dengan banyak orang.',
    category: 'API',
    socialDimension: 'extrovert',
    testType: 'free',
    targetElement: 'API',
    options: likert('API'),
  },
  {
    text: 'Saya merasa nyaman menjaga kestabilan dan rutinitas sehari-hari.',
    category: 'TANAH',
    socialDimension: 'balance',
    testType: 'free',
    targetElement: 'TANAH',
    options: likert('TANAH'),
  },
  {
    text: 'Saya suka bekerja dengan aturan, detail, dan struktur yang jelas.',
    category: 'LOGAM',
    socialDimension: 'introvert',
    testType: 'free',
    targetElement: 'LOGAM',
    options: likert('LOGAM'),
  },
  {
    text: 'Saya mudah menyesuaikan diri ketika situasi berubah tiba-tiba.',
    category: 'AIR',
    socialDimension: 'introvert',
    testType: 'free',
    targetElement: 'AIR',
    options: likert('AIR'),
  },
  {
    text: 'Saat menghadapi masalah besar, saya cenderung langsung mencari peluang baru.',
    category: 'KAYU',
    socialDimension: 'extrovert',
    testType: 'paid',
    targetElement: 'KAYU',
    options: likert('KAYU'),
  },
  {
    text: 'Saya merasa energi saya meningkat ketika harus tampil, meyakinkan, atau menginspirasi orang lain.',
    category: 'API',
    socialDimension: 'extrovert',
    testType: 'paid',
    targetElement: 'API',
    options: likert('API'),
  },
  {
    text: 'Saya sering menjadi tempat orang lain bergantung karena dianggap paling stabil.',
    category: 'TANAH',
    socialDimension: 'balance',
    testType: 'paid',
    targetElement: 'TANAH',
    options: likert('TANAH'),
  },
  {
    text: 'Saya cenderung mengecek ulang detail sebelum merasa pekerjaan benar-benar selesai.',
    category: 'LOGAM',
    socialDimension: 'introvert',
    testType: 'paid',
    targetElement: 'LOGAM',
    options: likert('LOGAM'),
  },
  {
    text: 'Saya lebih suka mengamati dulu sebelum memutuskan tindakan terbaik.',
    category: 'AIR',
    socialDimension: 'introvert',
    testType: 'paid',
    targetElement: 'AIR',
    options: likert('AIR'),
  },
  {
    text: 'Dalam tim, saya sering mengambil peran untuk membuka arah atau strategi baru.',
    category: 'KAYU',
    socialDimension: 'extrovert',
    testType: 'paid',
    targetElement: 'KAYU',
    options: likert('KAYU'),
  },
  {
    text: 'Saya mudah menunjukkan emosi, semangat, atau antusiasme kepada orang lain.',
    category: 'API',
    socialDimension: 'extrovert',
    testType: 'paid',
    targetElement: 'API',
    options: likert('API'),
  },
  {
    text: 'Saya merasa puas jika bisa menjaga orang lain tetap aman, tenang, dan teratur.',
    category: 'TANAH',
    socialDimension: 'balance',
    testType: 'paid',
    targetElement: 'TANAH',
    options: likert('TANAH'),
  },
  {
    text: 'Saya lebih percaya keputusan yang berbasis data, aturan, dan standar yang jelas.',
    category: 'LOGAM',
    socialDimension: 'introvert',
    testType: 'paid',
    targetElement: 'LOGAM',
    options: likert('LOGAM'),
  },
  {
    text: 'Saya bisa tetap tenang dan fleksibel walau kondisi di sekitar belum pasti.',
    category: 'AIR',
    socialDimension: 'introvert',
    testType: 'paid',
    targetElement: 'AIR',
    options: likert('AIR'),
  },
];
