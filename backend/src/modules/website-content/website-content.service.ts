import { Injectable } from '@nestjs/common';
import { ContentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_SECTION_DEFINITIONS = [
  { key: 'hero', title: 'Hero', order: 1, data: {} },
  {
    key: 'about',
    title: 'Tentang Kami',
    order: 2,
    data: {
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
    order: 3,
    data: {
      badge: 'Layanan Kami',
      title: 'Produk & Jasa',
      subtitle: 'Solusi pengembangan talenta untuk individu maupun institusi',
    },
  },
  {
    key: 'promo',
    title: 'Promo Test Gratis',
    order: 4,
    data: {
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
  { key: 'products', title: 'Produk Homepage', order: 5, data: {} },
  { key: 'testimonials', title: 'Testimonial', order: 6, data: {} },
  {
    key: 'benefits',
    title: 'Keunggulan',
    order: 7,
    data: {
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
  { key: 'activities', title: 'Kegiatan', order: 8, data: {} },
  {
    key: 'articles',
    title: 'Artikel',
    order: 9,
    data: {
      title: 'Artikel & Insight Terbaru',
      subtitle: 'Pelajari lebih dalam tentang kepribadian, bakat, dan pengembangan diri.',
    },
  },
  {
    key: 'visimisi',
    title: 'Visi & Misi',
    order: 10,
    data: {
      visi:
        'Menjadi bagian dari kemajuan bangsa lewat peran EDUKASI JATIDIRI di berbagai lembaga, institusi, dan organisasi di negeri tercinta.',
      misi: [
        'Membangun kemitraan edukasi jatidiri strategis dengan stakeholder dunia pendidikan, lembaga, institusi, dan masyarakat luas.',
      ],
    },
  },
  { key: 'banners', title: 'Banners', order: 11, data: {} },
  {
    key: 'cta',
    title: 'Call To Action',
    order: 12,
    data: {
      title: 'Siap Menemukan Potensi Anda?',
      subtitle:
        'Bergabunglah dengan ribuan orang yang telah mulai mengenal jati diri dan potensi terbaiknya bersama NEWME CLASS.',
      ctaLoggedIn: 'Mulai Test Sekarang',
      ctaGuest: 'Daftar Sekarang - GRATIS!',
    },
  },
];

const DEFAULT_HERO_SLIDES = [
  {
    title: 'COMPANY PROFILE',
    subtitle: 'NEWMECLASS',
    imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80',
    order: 1,
  },
  {
    title: 'SIAPA KAMI',
    subtitle: 'PT. MITRA SEMESTA EDUCLASS',
    imageUrl: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200&q=80',
    order: 2,
  },
  {
    title: 'PRODUK USAHA',
    subtitle: 'NIB: 2805240064989',
    imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80',
    order: 3,
  },
  {
    title: 'VISI & MISI',
    subtitle: 'NEWME CLASS',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80',
    order: 4,
  },
];

const DEFAULT_HOMEPAGE_PRODUCTS = [
  {
    name: 'NEWME TEST',
    description: 'Tes Kepribadian 5 Element untuk mengenal gaya diri dan potensi alami.',
    imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
    order: 1,
  },
  {
    name: 'KELAS GALI BAKAT',
    description: 'Program pengembangan potensi untuk sekolah, yayasan, dan komunitas belajar.',
    imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80',
    order: 2,
  },
  {
    name: 'NEWME CLINIC',
    description: 'Pendampingan personal untuk pengembangan diri, karir, dan arah belajar.',
    imageUrl: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=800&q=80',
    order: 3,
  },
  {
    name: 'NEWME CLASS',
    description: 'Pelatihan dan workshop untuk penguatan karakter, potensi, dan kolaborasi tim.',
    imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
    order: 4,
  },
  {
    name: 'MERCHANDISE KOMUNITAS',
    description: 'Produk komunitas NEWME untuk memperkuat identitas, koneksi, dan engagement.',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    order: 5,
  },
  {
    name: 'DIGITAL APPS',
    description: 'Aplikasi dan tools digital untuk observasi, tes, dan pelaporan hasil.',
    imageUrl: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&q=80',
    order: 6,
  },
];

const DEFAULT_TESTIMONIALS = [
  {
    name: 'Siti Rahma',
    role: 'Kepala Sekolah - Yayasan Al Karim',
    quote:
      'Program Kelas Gali Bakat yang diadakan NEWMECLASS memberi antusias tinggi bagi murid kami dan membantu kami melihat potensi mereka lebih jelas.',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    order: 1,
  },
  {
    name: 'Asmi Kamal',
    role: 'Mahasiswa',
    quote:
      'Setelah diobservasi oleh NEWMECLASS, saya semakin mengerti tentang siapa diri saya dan lebih yakin menentukan langkah pengembangan ke depan.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    order: 2,
  },
  {
    name: 'Dr. Ahmad Fauzi',
    role: 'Dosen Psikologi',
    quote:
      'Pendekatan 5 Element yang digunakan NEWMECLASS terasa komprehensif, mudah dijelaskan, dan relevan untuk edukasi maupun pengembangan profesional.',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80',
    order: 3,
  },
  {
    name: 'Rina Susanti',
    role: 'HR Manager',
    quote:
      'Program kolaborasi dengan NEWMECLASS membantu tim kami memahami karakter kerja dan meningkatkan kualitas komunikasi internal.',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
    order: 4,
  },
];

const DEFAULT_ACTIVITIES = [
  {
    title: 'Outbound Training',
    description: 'Program experiential learning untuk membangun karakter, teamwork, dan resiliensi.',
    imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    order: 1,
  },
  {
    title: 'Coaching / Upscale Talent',
    description: 'Pendampingan pengembangan potensi diri dan akselerasi performa personal.',
    imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
    order: 2,
  },
  {
    title: 'Edukasi Bisnis',
    description: 'Program edukasi untuk mindset, kesiapan kerja, dan keberanian membangun masa depan.',
    imageUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=80',
    order: 3,
  },
  {
    title: 'Kontes Brand Ambassador',
    description: 'Aktivasi komunitas yang memberi ruang ekspresi dan peluang bertumbuh bersama.',
    imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=80',
    order: 4,
  },
];

const DEFAULT_ARTICLES = [
  {
    title: 'Mengapa Mengenal Potensi Diri Penting Sejak Dini',
    slug: 'mengapa-mengenal-potensi-diri-penting-sejak-dini',
    summary:
      'Potensi diri yang dikenali sejak awal membantu seseorang memilih jalur belajar, karir, dan lingkungan yang lebih sesuai.',
    content:
      'Potensi diri yang dikenali sejak awal membantu peserta memilih jalur belajar dan pengembangan yang lebih tepat.',
    imageUrl: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&q=80',
  },
  {
    title: '5 Element dan Cara Membaca Kecenderungan Kepribadian',
    slug: '5-element-dan-cara-membaca-kecenderungan-kepribadian',
    summary:
      'Pendekatan 5 Element membantu melihat kecenderungan energi, cara berpikir, dan gaya beradaptasi seseorang secara lebih sederhana.',
    content:
      'Model 5 Element membantu membaca dominasi energi, kekuatan, dan gaya adaptasi seseorang dengan lebih sederhana.',
    imageUrl: 'https://images.unsplash.com/photo-1598162942982-5cb74331817c?w=1200&q=80',
  },
  {
    title: 'Peran Yayasan dan Sekolah dalam Mendorong Talenta',
    slug: 'peran-yayasan-dan-sekolah-dalam-mendorong-talenta',
    summary:
      'Lembaga pendidikan dan yayasan punya peran strategis untuk membantu peserta didik menemukan arah pertumbuhan yang lebih sesuai dengan jati dirinya.',
    content:
      'Sekolah dan yayasan berperan penting membantu peserta menemukan arah pertumbuhan yang sesuai dengan jati dirinya.',
    imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&q=80',
  },
];

@Injectable()
export class WebsiteContentService {
  constructor(private readonly prisma: PrismaService) {}

  private toContentStatus(isActive?: boolean, status?: string) {
    if (typeof isActive === 'boolean') {
      return isActive ? ContentStatus.PUBLISHED : ContentStatus.ARCHIVED;
    }
    if (typeof status === 'string' && status in ContentStatus) {
      return status as ContentStatus;
    }
    return undefined;
  }

  private mapHeroSlide(row: any) {
    if (!row) return null;
    return {
      id: row.id,
      _id: row.id,
      title: row.title || '',
      subtitle: row.subtitle || '',
      description: row.description || '',
      badge: row.badge || '',
      imageUrl: row.imageUrl || '',
      ctaText: row.ctaText || '',
      ctaLink: row.ctaLink || '/',
      order: Number(row.order || 0),
      isActive: row.isActive ?? row.status === ContentStatus.PUBLISHED,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private sanitizeHeroSlideInput(body: any) {
    const nextStatus = this.toContentStatus(body?.isActive, body?.status);
    return {
      title: body?.title || '',
      subtitle: body?.subtitle || '',
      description: body?.description || '',
      badge: body?.badge || '',
      imageUrl: body?.imageUrl || body?.image || '',
      ctaText: body?.ctaText || '',
      ctaLink: body?.ctaLink || body?.link || '/',
      order: Number(body?.order || 0),
      isActive: body?.isActive ?? true,
      ...(nextStatus ? { status: nextStatus } : {}),
    };
  }

  private mapHomepageProduct(row: any) {
    if (!row) return null;
    return {
      id: row.id,
      _id: row.id,
      title: row.name || '',
      name: row.name || '',
      subtitle: row.subtitle || row.description || '',
      description: row.description || '',
      imageUrl: row.imageUrl || '',
      link: row.link || '/',
      badge: row.badge || '',
      order: Number(row.order || 0),
      isActive: row.isActive ?? row.status === ContentStatus.PUBLISHED,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private sanitizeHomepageProductInput(body: any) {
    const nextStatus = this.toContentStatus(body?.isActive, body?.status);
    return {
      name: body?.name || body?.title || '',
      description: body?.description || body?.subtitle || '',
      subtitle: body?.subtitle || '',
      imageUrl: body?.imageUrl || '',
      link: body?.link || '/',
      badge: body?.badge || '',
      order: Number(body?.order || 0),
      isActive: body?.isActive ?? true,
      ...(nextStatus ? { status: nextStatus } : {}),
    };
  }

  private mapTestimonial(row: any) {
    if (!row) return null;
    return {
      id: row.id,
      _id: row.id,
      name: row.name || '',
      organization: row.organization || '',
      role: row.role || '',
      text: row.quote || '',
      quote: row.quote || '',
      imageUrl: row.avatarUrl || '',
      avatarUrl: row.avatarUrl || '',
      rating: Number(row.rating || 5),
      order: Number(row.order || 0),
      isActive: row.isActive ?? row.status === ContentStatus.PUBLISHED,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private sanitizeTestimonialInput(body: any) {
    const nextStatus = this.toContentStatus(body?.isActive, body?.status);
    return {
      name: body?.name || '',
      organization: body?.organization || body?.institution || '',
      role: body?.role || '',
      quote: body?.quote || body?.text || '',
      avatarUrl: body?.avatarUrl || body?.imageUrl || '',
      rating: Number(body?.rating || 5),
      order: Number(body?.order || 0),
      isActive: body?.isActive ?? true,
      ...(nextStatus ? { status: nextStatus } : {}),
    };
  }

  private mapActivity(row: any) {
    if (!row) return null;
    return {
      id: row.id,
      _id: row.id,
      title: row.title || '',
      description: row.description || '',
      imageUrl: row.imageUrl || '',
      link: row.link || '/',
      order: Number(row.order || 0),
      isActive: row.isActive ?? row.status === ContentStatus.PUBLISHED,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private sanitizeActivityInput(body: any) {
    const nextStatus = this.toContentStatus(body?.isActive, body?.status);
    return {
      title: body?.title || '',
      description: body?.description || '',
      imageUrl: body?.imageUrl || '',
      link: body?.link || '/',
      order: Number(body?.order || 0),
      isActive: body?.isActive ?? true,
      ...(nextStatus ? { status: nextStatus } : {}),
    };
  }

  private isEmptyContent(value: any) {
    return !value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length === 0;
  }

  private async ensureDefaultSections() {
    const keys = DEFAULT_SECTION_DEFINITIONS.map((item) => item.key);
    const existing = await this.prisma.websiteSection.findMany({
      where: { key: { in: keys } },
      select: { id: true, key: true, title: true, order: true, data: true },
    });
    const existingByKey = new Map(existing.map((item) => [item.key, item]));
    const operations: any[] = [];

    for (const section of DEFAULT_SECTION_DEFINITIONS) {
      const row = existingByKey.get(section.key);
      if (!row) {
        operations.push(
          this.prisma.websiteSection.create({
            data: {
              key: section.key,
              title: section.title,
              order: section.order,
              isVisible: true,
              data: section.data,
            },
          }),
        );
        continue;
      }

      operations.push(
        this.prisma.websiteSection.update({
          where: { id: row.id },
          data: {
            ...(row.title !== section.title ? { title: section.title } : {}),
            ...((!row.order || row.order <= 0) ? { order: section.order } : {}),
            ...(this.isEmptyContent(row.data) && !this.isEmptyContent(section.data) ? { data: section.data } : {}),
          },
        }),
      );
    }

    if (operations.length) {
      await this.prisma.$transaction(operations);
    }
  }

  private async ensureCollectionSeed() {
    const [heroCount, productCount, testimonialCount, activityCount, articleCount] = await Promise.all([
      this.prisma.heroSlide.count(),
      this.prisma.homepageProduct.count(),
      this.prisma.testimonial.count(),
      this.prisma.activity.count(),
      this.prisma.article.count(),
    ]);

    if (heroCount === 0) {
      await this.prisma.heroSlide.createMany({
        data: DEFAULT_HERO_SLIDES,
      });
    }

    if (productCount === 0) {
      await this.prisma.homepageProduct.createMany({
        data: DEFAULT_HOMEPAGE_PRODUCTS,
      });
    }

    if (testimonialCount === 0) {
      await this.prisma.testimonial.createMany({
        data: DEFAULT_TESTIMONIALS,
      });
    }

    if (activityCount === 0) {
      await this.prisma.activity.createMany({
        data: DEFAULT_ACTIVITIES,
      });
    }

    if (articleCount === 0) {
      await this.prisma.article.createMany({
        data: DEFAULT_ARTICLES,
      });
    }
  }

  private mapSection(section: any) {
    if (!section) return null;
    return {
      id: section.id,
      key: section.key,
      title: section.title,
      isVisible: section.isVisible ?? true,
      order: Number(section.order || 0),
      content: section.data && typeof section.data === 'object' ? section.data : {},
      updatedAt: section.updatedAt,
    };
  }

  async heroSlides() {
    const rows = await this.prisma.heroSlide.findMany({ orderBy: { order: 'asc' } });
    return rows.map((row) => this.mapHeroSlide(row));
  }
  async createHeroSlide(body: any) {
    const created = await this.prisma.heroSlide.create({ data: this.sanitizeHeroSlideInput(body) });
    return this.mapHeroSlide(created);
  }
  async updateHeroSlide(id: string, body: any) {
    const existing = await this.prisma.heroSlide.findUnique({ where: { id } });
    const updated = await this.prisma.heroSlide.update({
      where: { id },
      data: this.sanitizeHeroSlideInput({ ...this.mapHeroSlide(existing), ...body }),
    });
    return this.mapHeroSlide(updated);
  }
  async deleteHeroSlide(id: string) { await this.prisma.heroSlide.delete({ where: { id } }); return { message: 'Deleted' }; }

  async products() {
    const rows = await this.prisma.homepageProduct.findMany({ orderBy: { order: 'asc' } });
    return rows.map((row) => this.mapHomepageProduct(row));
  }
  async createProduct(body: any) {
    const created = await this.prisma.homepageProduct.create({ data: this.sanitizeHomepageProductInput(body) });
    return this.mapHomepageProduct(created);
  }
  async updateProduct(id: string, body: any) {
    const existing = await this.prisma.homepageProduct.findUnique({ where: { id } });
    const updated = await this.prisma.homepageProduct.update({
      where: { id },
      data: this.sanitizeHomepageProductInput({ ...this.mapHomepageProduct(existing), ...body }),
    });
    return this.mapHomepageProduct(updated);
  }
  async deleteProduct(id: string) { await this.prisma.homepageProduct.delete({ where: { id } }); return { message: 'Deleted' }; }

  async testimonials() {
    const rows = await this.prisma.testimonial.findMany({ orderBy: { order: 'asc' } });
    return rows.map((row) => this.mapTestimonial(row));
  }
  async createTestimonial(body: any) {
    const created = await this.prisma.testimonial.create({ data: this.sanitizeTestimonialInput(body) });
    return this.mapTestimonial(created);
  }
  async updateTestimonial(id: string, body: any) {
    const existing = await this.prisma.testimonial.findUnique({ where: { id } });
    const updated = await this.prisma.testimonial.update({
      where: { id },
      data: this.sanitizeTestimonialInput({ ...this.mapTestimonial(existing), ...body }),
    });
    return this.mapTestimonial(updated);
  }
  async deleteTestimonial(id: string) { await this.prisma.testimonial.delete({ where: { id } }); return { message: 'Deleted' }; }

  async activities() {
    const rows = await this.prisma.activity.findMany({ orderBy: { order: 'asc' } });
    return rows.map((row) => this.mapActivity(row));
  }
  async createActivity(body: any) {
    const created = await this.prisma.activity.create({ data: this.sanitizeActivityInput(body) });
    return this.mapActivity(created);
  }
  async updateActivity(id: string, body: any) {
    const existing = await this.prisma.activity.findUnique({ where: { id } });
    const updated = await this.prisma.activity.update({
      where: { id },
      data: this.sanitizeActivityInput({ ...this.mapActivity(existing), ...body }),
    });
    return this.mapActivity(updated);
  }
  async deleteActivity(id: string) { await this.prisma.activity.delete({ where: { id } }); return { message: 'Deleted' }; }

  async sections() {
    await this.ensureDefaultSections();
    const rows = await this.prisma.websiteSection.findMany({ orderBy: { order: 'asc' } });
    return rows.map((row) => this.mapSection(row)).filter(Boolean);
  }
  sectionImages() {
    return this.prisma.mediaAsset.findMany({
      where: { category: { in: ['hero-slides', 'banners', 'products-home', 'products-shop', 'testimonials', 'activities', 'articles', 'team', 'general'] } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }
  async reorderSections(body: any) {
    const updates = Array.isArray(body?.sections) ? body.sections : [];
    for (const item of updates) {
      const id = item?.id || item?._id;
      if (!id) continue;
      await this.prisma.websiteSection.update({ where: { id }, data: { order: Number(item.order || 0) } });
    }
    return this.sections();
  }

  async updateSection(id: string, body: any) {
    const existing = await this.prisma.websiteSection.findUnique({ where: { id } });
    const nextIsVisible =
      typeof body?.isVisible === 'boolean'
        ? body.isVisible
        : typeof body?.visible === 'boolean'
          ? body.visible
          : undefined;
    const nextContent =
      body?.content && typeof body.content === 'object'
        ? body.content
        : body?.data && typeof body.data === 'object'
          ? body.data
          : existing?.data && typeof existing.data === 'object'
            ? existing.data
            : {};
    const updated = await this.prisma.websiteSection.update({
      where: { id },
      data: {
        title: body?.title || body?.label || existing?.title || 'Section',
        ...(typeof nextIsVisible === 'boolean' ? { isVisible: nextIsVisible } : {}),
        data: nextContent,
      },
    });
    return this.mapSection(updated);
  }

  async seedDefaults() {
    await this.ensureDefaultSections();
    await this.ensureCollectionSeed();

    return {
      message: 'Konten default landing page berhasil disinkronkan',
      sections: await this.sections(),
    };
  }
}
