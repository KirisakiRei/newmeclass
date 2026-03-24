import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { DEFAULT_DEV_FEE_PERCENT, MIN_PREMIUM_PRICE, resolveCanonicalDevFeePercent, resolveCanonicalPaymentAmount } from 'src/common/settings/finance-settings';
import { LANDING_DOMAIN_SETTING_KEYS } from '../landing-cms/landing-cms.defaults';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_SETTINGS: Record<string, any> = {
  visiMisi: {
    visi: 'Menjadi bagian dari kemajuan bangsa lewat peran EDUKASI JATIDIRI di berbagai lembaga, institusi & organisasi di negeri tercinta.',
    misi: 'Membangun kemitraan edukasi JATIDIRI STRATEGIS dengan stakeholder dunia, lembaga, institusi & masyarakat luas, demi men-ciptakan Indonesia yang cakap & bahagia.',
    subMisi: 'Menjadi MITRA pendorong capaian VISI & MISI mitra.',
  },
  companyTestimonials: [
    {
      name: 'Siti Rahma',
      institution: 'Yayasan Al Karim',
      text: 'Program Kelas Gali Bakat sangat membantu siswa-siswa kami dalam mengenali potensi mereka. Hasilnya sangat positif!',
      rating: 5,
    },
    {
      name: 'Asmi Kamal',
      institution: 'Individu',
      text: 'Observasi dari NEWMECLASS sangat membantu saya dalam mengambil keputusan untuk masa depan. Sangat recommended!',
      rating: 5,
    },
  ],
  clientBenefits: [
    'Lebih mengenal diri dan identifikasi potensi',
    'Gaya hidup yang nyaman sesuai preferensi personal',
    'Percepatan pencapaian impian',
    'Merchandise komunitas NMC',
    'Berbagai produk dan layanan dari kolaborator NMC',
    'Diskon, bonus, reward, dan royalti',
  ],
  services: [
    {
      id: 'test',
      name: '5 Test Dasar Gratis',
      title: '5 TEST GRATIS',
      description: 'Observasi mandiri untuk mengenal potensi dan bakat alami Anda',
      icon: 'ClipboardList',
      color: '#FFD700',
      features: [
        'Tes kepribadian berbasis NMC',
        'Analisis bakat dan potensi tersembunyi',
        'Sertifikat digital',
        'Konsultasi hasil tes',
      ],
      link: '/newme-test',
    },
    {
      id: 'clinic',
      name: 'NEWME CLINIC',
      title: 'CLINIC',
      description: 'Konsultasi personal untuk pengembangan diri dan karir',
      icon: 'Stethoscope',
      color: '#FFD700',
      features: [
        'Konsultasi one-on-one',
        'Pembimbingan karir',
        'Coaching personal',
        'Follow-up berkala',
      ],
    },
    {
      id: 'class',
      name: 'NEWME CLASS',
      title: 'CLASS',
      description: 'Program kelas untuk menggali dan mengoptimalkan potensi',
      icon: 'GraduationCap',
      color: '#FFD700',
      features: [
        'Kelas Gali Bakat',
        'Kelas Optimasi Potensi',
        'Bimbel Tematik',
        'Workshop & Training',
      ],
    },
    {
      id: 'gallery',
      name: 'NEWME GALLERY',
      title: 'GALLERY',
      description: 'Dokumentasi kegiatan dan testimoni peserta program',
      icon: 'Images',
      color: '#FFD700',
      features: [
        'Foto kegiatan',
        'Video testimoni',
        'Dokumentasi event',
        'Portfolio peserta',
      ],
    },
    {
      id: 'net',
      name: 'NEWME NET',
      title: 'NET',
      description: 'Jaringan komunitas dan kolaborasi NEWME',
      icon: 'Network',
      color: '#FFD700',
      features: [
        'Komunitas member',
        'Networking event',
        'Kolaborasi mitra',
        'Merchant partner',
      ],
    },
  ],
  kelasGaliBakat: {
    title: 'KELAS GALI BAKAT',
    subtitle: "We're Here for student to know they trueself & talent",
    description: 'Program observasi siswa untuk mengenal bakat dan potensi diri',
    purpose:
      'KELAS GALI BAKAT adalah produk observasi siswa, merupakan program awal setiap kolaborasi yang akan dikerjasamakan dengan seluruh mitra NEWMECLASS, sebelum dilanjutkan ke kelas lanjutan yang kami beri nama KELAS OPTIMASI POTENSI.',
    phases: [
      {
        title: 'SOSIALISASI KGB',
        description:
          'Dimulai dengan sosialisasi kepada guru dan orang tua tentang pentingnya tes observasi bakat ini',
      },
      {
        title: 'PROSES OBSERVASI',
        description: 'Proses observasi diikuti oleh siswa dan dilakukan dengan cara yang menyenangkan',
      },
      {
        title: 'PEMBAGIAN SERTIFIKAT',
        description: 'Ekspresi bahagia siswa yang telah menemukan jati diri mereka',
      },
    ],
    benefits: [
      'Memiliki pondasi mengenal diri',
      'Memahami kelemahan untuk diperbaiki',
      'Materi pembelajaran lebih efektif',
      'Memilih karir tepat lebih cepat tercapai',
      'Perencanaan lebih matang',
      'Orang tua/pendidik lebih paham anak',
      'SETIAP KITA JENIUS, TERLEBIH SESUAI BAKAT ALAMI',
    ],
    procedures: [
      'AUDIENS',
      'SOSIALISASI ke GURU-GURU',
      'TES NMC GURU-GURU',
      'Penyerahan SERTIFIKAT NMC',
      'SOSIALISASI ke ORANG TUA SISWA',
      'TES NMC MURID-MURID',
      'Penyerahan SERTIFIKAT NMC',
      'SOSIALISASI hasil tes NMC',
    ],
  },
};

const REMOVED_SETTING_KEYS = new Set(['paydisiniApiId', 'paydisiniApiKey']);
const TEAM_MANAGEMENT_KEYS = new Set(['boardOfDirectors', 'teamSupport', 'partners']);

const isPlainObject = (value: unknown): value is Record<string, any> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private defaultJenjangConfig() {
    return {
      sd: { label: 'SD', min: 6, max: 12 },
      smp: { label: 'SMP', min: 13, max: 15 },
      sma: { label: 'SMA', min: 16, max: 18 },
      dewasa: { label: 'DEWASA', min: 19, max: 99 },
    };
  }

  async getAll() {
    const rows = await this.prisma.setting.findMany();
    const obj: Record<string, any> = { ...DEFAULT_SETTINGS };
    let landingGlobal: Record<string, any> | null = null;
    for (const row of rows) {
      if (REMOVED_SETTING_KEYS.has(row.key)) continue;
      if (row.key === LANDING_DOMAIN_SETTING_KEYS.global && isPlainObject(row.value)) {
        landingGlobal = row.value as Record<string, any>;
      }
      obj[row.key] = row.value;
    }

    if (landingGlobal) {
      const nextSiteName = String(landingGlobal.siteName || '').trim();
      const nextTagline = String(landingGlobal.tagline || '').trim();
      const nextMetaTitle = String(landingGlobal.metaTitle || '').trim();
      const nextMetaDescription = String(landingGlobal.metaDescription || '').trim();
      const nextMetaKeywords = String(landingGlobal.metaKeywords || '').trim();
      const nextLogoUrl = String(landingGlobal.logoUrl || '').trim();
      const nextFaviconUrl = String(landingGlobal.faviconUrl || '').trim();
      const general = isPlainObject(obj.general) ? { ...obj.general } : {};

      obj.siteName = nextSiteName;
      obj.companyName = nextSiteName;
      obj.siteTitle = nextMetaTitle || nextSiteName;
      obj.siteDescription = nextTagline;
      obj.tagline = nextTagline;
      obj.phone = String(landingGlobal.phone || '').trim();
      obj.email = String(landingGlobal.email || '').trim();
      obj.whatsapp = String(landingGlobal.whatsapp || '').trim();
      obj.address = String(landingGlobal.address || '').trim();
      obj.logoUrl = nextLogoUrl;
      obj.logo = nextLogoUrl;
      obj.faviconUrl = nextFaviconUrl;
      obj.metaTitle = nextMetaTitle;
      obj.metaDescription = nextMetaDescription;
      obj.metaKeywords = nextMetaKeywords;
      obj.seoMetaDescription = nextMetaDescription;
      obj.seoKeywords = nextMetaKeywords;
      obj.socialLinks = Array.isArray(landingGlobal.socialLinks) ? landingGlobal.socialLinks : [];
      obj.maintenanceMode = Boolean(landingGlobal.maintenanceMode);
      obj.general = {
        ...general,
        siteName: obj.siteName,
        companyName: obj.companyName,
        siteTitle: obj.siteTitle,
        siteDescription: obj.siteDescription,
        tagline: obj.tagline,
        phone: obj.phone,
        email: obj.email,
        whatsapp: obj.whatsapp,
        address: obj.address,
        logoUrl: obj.logoUrl,
        logo: obj.logo,
        faviconUrl: obj.faviconUrl,
        metaTitle: obj.metaTitle,
        metaDescription: obj.metaDescription,
        metaKeywords: obj.metaKeywords,
        seoMetaDescription: obj.seoMetaDescription,
        seoKeywords: obj.seoKeywords,
        socialLinks: obj.socialLinks,
        maintenanceMode: obj.maintenanceMode,
      };
    }

    delete obj.paydisiniApiId;
    delete obj.paydisiniApiKey;
    obj.paymentAmount = resolveCanonicalPaymentAmount(obj);
    obj.testPrice = obj.paymentAmount;
    obj.devFeePercent = resolveCanonicalDevFeePercent(obj);
    return obj;
  }

  async updateAll(data: Record<string, unknown>) {
    const current = await this.getAll();
    const payload = { ...(data || {}) } as Record<string, any>;
    const nextPaymentAmount = resolveCanonicalPaymentAmount(payload.paymentAmount !== undefined || payload.testPrice !== undefined
      ? { ...current, ...payload }
      : current);
    const nextDevFeePercent = resolveCanonicalDevFeePercent(payload.devFeePercent !== undefined ? { ...current, ...payload } : current);
    const pricingChanged =
      nextPaymentAmount !== resolveCanonicalPaymentAmount(current)
      || nextDevFeePercent !== resolveCanonicalDevFeePercent(current);

    if (pricingChanged && String(payload.confirmationText || '').trim().toUpperCase() !== 'KONFIRMASI') {
      throw new BadRequestException('Perubahan pricing memerlukan konfirmasi teks KONFIRMASI.');
    }

    delete payload.confirmationText;
    if (payload.paymentAmount !== undefined || payload.testPrice !== undefined) {
      payload.paymentAmount = nextPaymentAmount;
      payload.testPrice = nextPaymentAmount;
    }
    if (payload.devFeePercent !== undefined) {
      payload.devFeePercent = nextDevFeePercent;
    }

    const entries = Object.entries(payload).filter(([key]) => !REMOVED_SETTING_KEYS.has(key));
    for (const [key, value] of entries) {
      await this.prisma.setting.upsert({ where: { key }, create: { key, value: value as any }, update: { value: value as any } });
    }
    return this.getAll();
  }

  async getTeamManagement() {
    const all = await this.getAll();
    return {
      boardOfDirectors: Array.isArray(all.boardOfDirectors) ? all.boardOfDirectors : [],
      teamSupport: Array.isArray(all.teamSupport) ? all.teamSupport : [],
      partners: Array.isArray(all.partners) ? all.partners : [],
    };
  }

  async updateTeamManagementSection(sectionKey: string, items: unknown) {
    if (!TEAM_MANAGEMENT_KEYS.has(sectionKey)) {
      throw new Error(`Unsupported team management section: ${sectionKey}`);
    }
    await this.updateAll({
      [sectionKey]: Array.isArray(items) ? items : [],
    });
    return this.getTeamManagement();
  }

  async getJenjangConfig() {
    const row = await this.prisma.setting.findUnique({ where: { key: 'jenjangConfig' } });
    return row?.value || this.defaultJenjangConfig();
  }

  async updateJenjangConfig(value: any) {
    await this.prisma.setting.upsert({ where: { key: 'jenjangConfig' }, create: { key: 'jenjangConfig', value }, update: { value } });
    return value;
  }

  async deleteBanner(index: number) {
    const row = await this.prisma.setting.findUnique({ where: { key: 'general' } });
    const value = (row?.value as any) || {};
    const banners: any[] = Array.isArray(value.banners) ? value.banners : [];
    if (index >= 0 && index < banners.length) {
      banners.splice(index, 1);
    }
    value.banners = banners;
    await this.prisma.setting.upsert({ where: { key: 'general' }, create: { key: 'general', value }, update: { value } });
    return { message: `Banner ${index} deleted`, banners };
  }

  async getTestPrice() {
    const paymentAmountRow = await this.prisma.setting.findUnique({ where: { key: 'paymentAmount' } });
    if (typeof paymentAmountRow?.value === 'number') {
      return { testPrice: Math.max(Number(paymentAmountRow.value), MIN_PREMIUM_PRICE) };
    }

    const row = await this.prisma.setting.findUnique({ where: { key: 'general' } });
    const value = (row?.value as any) || {};
    return { testPrice: resolveCanonicalPaymentAmount(value) };
  }

  async getGeneral() {
    const row = await this.prisma.setting.findUnique({ where: { key: 'general' } });
    const value = (row?.value as any) || { testPriceSettings: { basePrice: MIN_PREMIUM_PRICE } };
    if (!value.testPriceSettings) {
      value.testPriceSettings = { basePrice: value.testPrice || MIN_PREMIUM_PRICE };
    }
    value.testPriceSettings.basePrice = resolveCanonicalPaymentAmount({
      paymentAmount: value.testPriceSettings.basePrice,
      testPrice: value.testPrice,
    });
    return value;
  }

  async getSystemSummary() {
    const all = await this.getAll();
    const gatewayConfigured = !!String(process.env.MIDTRANS_SERVER_KEY || '').trim();
    const payoutProvider = String(process.env.DISBURSEMENT_PROVIDER || 'manual').trim().toLowerCase() || 'manual';
    return {
      pricing: {
        testPrice: resolveCanonicalPaymentAmount(all),
        referralTotalPrice: 250000,
        referralShareBudget: 150000,
        yayasanPricingManagedBy: 'mitra_approval_and_admin_review',
      },
      developerFee: {
        percent: resolveCanonicalDevFeePercent(all),
        bankName: all.devBankName || '',
        bankAccount: all.devBankAccount || '',
        accountName: all.devAccountName || '',
      },
      paymentGateway: {
        provider: 'MIDTRANS',
        activeProvider: 'MIDTRANS',
        mode: String(process.env.MIDTRANS_IS_PRODUCTION || 'false').toLowerCase() === 'true' ? 'production' : 'sandbox',
        isConfigured: gatewayConfigured,
      },
      payoutGateway: {
        provider: payoutProvider,
        activeProvider: payoutProvider,
        mode: String(process.env.MIDTRANS_IS_PRODUCTION || 'false').toLowerCase() === 'true' ? 'production' : 'sandbox',
        isConfigured: payoutProvider === 'manual' || payoutProvider === 'mock'
          ? true
          : !!String(process.env.MIDTRANS_IRIS_API_KEY || process.env.MIDTRANS_IRIS_SANDBOX_API_KEY || process.env.MIDTRANS_IRIS_PRODUCTION_API_KEY || '').trim(),
      },
      featureFlags: {
        allowRegistration: !!all.allowRegistration,
        requirePayment: !!all.requirePayment,
        maintenanceMode: !!all.maintenanceMode,
      },
    };
  }
}
