// @ts-nocheck
export const DEFAULT_HOME_SECTIONS = [
  { key: 'hero', title: 'Hero', description: 'Slider utama di bagian paling atas landing page.', editable: false, isVisible: true, order: 1, content: {} },
  {
    key: 'about',
    title: 'Tentang Kami',
    description: 'Ringkasan profil dan pengenalan NEWME.',
    editable: true,
    isVisible: true,
    order: 2,
    content: {
      badge: 'Tentang Kami',
      title: 'Siapa Kami?',
      subtitle:
        'NEWMECLASS adalah brand dan produk dari PT. MITRA SEMESTA EDUCLASS yang fokus pada edukasi jatidiri, pengembangan potensi, dan komunitas talenta.',
      imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&q=80',
      stats: [
        { label: 'Peserta Aktif', value: '5000+' },
        { label: 'Mitra Lembaga', value: '50+' },
      ],
    },
  },
  {
    key: 'services',
    title: 'Layanan',
    description: 'Daftar layanan utama yang tampil di landing page.',
    editable: true,
    isVisible: true,
    order: 3,
    content: {
      badge: 'Layanan Kami',
      title: 'Produk & Jasa',
      subtitle: 'Solusi pengembangan talenta untuk individu maupun institusi',
    },
  },
  {
    key: 'promo',
    title: 'Promo',
    description: 'Blok ajakan untuk test gratis atau promo utama.',
    editable: true,
    isVisible: true,
    order: 4,
    content: {
      badge: 'GRATIS',
      title: '5 Test Dasar\nGratis!',
      subtitle:
        'Daftar sekarang dan dapatkan akses ke 5 test dasar gratis untuk mengenal potensi diri Anda.',
      ctaText: 'Daftar & Mulai Test Gratis',
      imageUrl: 'https://images.unsplash.com/photo-1598162942982-5cb74331817c?w=600&q=80',
      bulletPoints: [
        'Test Kepribadian Dasar',
        'Test Minat Dasar',
        'Test Bakat Dasar',
        'Hasil Instant',
        'Rekomendasi Pengembangan',
      ],
    },
  },
  { key: 'products', title: 'Produk Homepage', description: 'Kartu produk/layanan unggulan di beranda.', editable: false, isVisible: true, order: 5, content: {} },
  { key: 'testimonials', title: 'Testimonial', description: 'Slider testimoni untuk membangun kepercayaan.', editable: false, isVisible: true, order: 6, content: {} },
  {
    key: 'benefits',
    title: 'Keunggulan',
    description: 'Alasan memilih NEWME dan manfaat utama.',
    editable: true,
    isVisible: true,
    order: 7,
    content: {
      title: 'APA YANG DI_ TERIMA KLIEN',
      benefits: [
        {
          icon: '1',
          title: 'LEBIH KENAL DIRI & POTENSI...nya',
          desc:
            'Kondisi kurikulum pendidikan yang belum berbasis potensi membuat banyak orang jauh dari nilai jatidiri. NEWME membantu memetakan itu sejak awal.',
        },
        {
          icon: '2',
          title: 'NYAMAN dengan GAYA JATIDIRI...nya',
          desc:
            'Dengan mengenal siapa kita, kita lebih mudah memilih aktivitas, lingkungan, dan jalur pengembangan yang benar-benar cocok.',
        },
        {
          icon: '3',
          title: 'Resep AKSELERASI perjuangi IMPIAN',
          desc:
            'Hasil observasi membantu klien menyelaraskan impian, peran, dan eksekusi nyata secara lebih terstruktur.',
        },
        {
          icon: '4',
          title: 'Produk MERCHANDISE komunitas NMC',
          desc:
            'Komunitas NEWME memberi akses benefit dan identitas yang memperkuat keterlibatan peserta dalam ekosistem pengembangan diri.',
        },
        {
          icon: '5',
          title: 'Aneka PRODUK dan LAYANAN dari mitra NMC',
          desc:
            'Mitra NEWME siap menerima klien dengan berbagai benefit, diskon, promo, dan program lanjutan yang relevan.',
        },
      ],
    },
  },
  { key: 'activities', title: 'Kegiatan', description: 'Kegiatan atau aktivitas yang ditampilkan ke publik.', editable: false, isVisible: true, order: 8, content: {} },
  {
    key: 'articles',
    title: 'Artikel',
    description: 'Judul dan pengantar blok artikel terbaru.',
    editable: true,
    isVisible: true,
    order: 9,
    content: {
      title: 'Artikel & Insight Terbaru',
      subtitle: 'Pelajari lebih dalam tentang kepribadian, bakat, dan pengembangan diri.',
    },
  },
  {
    key: 'visimisi',
    title: 'Visi & Misi',
    description: 'Visi dan misi perusahaan pada landing page.',
    editable: true,
    isVisible: true,
    order: 10,
    content: {
      visi:
        'Menjadi bagian dari kemajuan bangsa lewat peran EDUKASI JATIDIRI di berbagai lembaga, institusi, dan organisasi di negeri tercinta.',
      misi: [
        'Membangun kemitraan edukasi jatidiri strategis dengan stakeholder dunia pendidikan, lembaga, institusi, dan masyarakat luas.',
      ],
    },
  },
  { key: 'banners', title: 'Banners', description: 'Slider banner promosi dan popup yang aktif.', editable: false, isVisible: true, order: 11, content: {} },
  {
    key: 'cta',
    title: 'Call To Action',
    description: 'Ajakan penutup di bagian bawah landing page.',
    editable: true,
    isVisible: true,
    order: 12,
    content: {
      title: 'Siap Menemukan Potensi Anda?',
      subtitle:
        'Bergabunglah dengan ribuan orang yang telah mulai mengenal jati diri dan potensi terbaiknya bersama NEWME CLASS.',
      ctaLoggedIn: 'Mulai Test Sekarang',
      ctaGuest: 'Daftar Sekarang - GRATIS!',
    },
  },
];

export const normalizeWebsiteSection = (value, index = 0) => {
  if (!value || typeof value !== 'object') return null;
  const id = value.id || value._id || null;
  const key = String(value.key || '').trim();
  if (!id || !key) return null;

  return {
    id,
    _id: id,
    key,
    title: value.title || value.label || DEFAULT_HOME_SECTIONS.find((item) => item.key === key)?.title || key,
    label: value.title || value.label || DEFAULT_HOME_SECTIONS.find((item) => item.key === key)?.title || key,
    description: value.description || DEFAULT_HOME_SECTIONS.find((item) => item.key === key)?.description || '',
    isVisible: typeof value.isVisible === 'boolean' ? value.isVisible : (typeof value.visible === 'boolean' ? value.visible : true),
    visible: typeof value.isVisible === 'boolean' ? value.isVisible : (typeof value.visible === 'boolean' ? value.visible : true),
    order: Number(value.order ?? index + 1),
    editable: typeof value.editable === 'boolean' ? value.editable : Boolean(DEFAULT_HOME_SECTIONS.find((item) => item.key === key)?.editable),
    content:
      value.content && typeof value.content === 'object'
        ? value.content
        : value.data && typeof value.data === 'object'
          ? value.data
          : {},
  };
};

export const sanitizeWebsiteSections = (sections) =>
  (Array.isArray(sections) ? sections : [])
    .map((section, index) => normalizeWebsiteSection(section, index))
    .filter(Boolean)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export const mergeWithDefaultSections = (sections) => {
  const normalized = sanitizeWebsiteSections(sections);
  const byKey = new Map(normalized.map((section) => [section.key, section]));
  const useFallbackOrder = normalized.length < DEFAULT_HOME_SECTIONS.length;

  const merged = DEFAULT_HOME_SECTIONS.map((section) => {
    const existing = byKey.get(section.key);
    if (existing) {
      return {
        ...existing,
        order: useFallbackOrder ? section.order : existing.order,
        content:
          existing.content && typeof existing.content === 'object' && Object.keys(existing.content).length > 0
            ? existing.content
            : section.content,
      };
    }

    return {
      ...section,
      id: `fallback-${section.key}`,
      _id: `fallback-${section.key}`,
      label: section.title,
      description: section.description,
      visible: section.isVisible,
      editable: section.editable,
    };
  });

  return merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
};
