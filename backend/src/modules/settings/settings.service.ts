import { Injectable } from '@nestjs/common';
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
    for (const row of rows) obj[row.key] = row.value;
    obj.paymentAmount = Math.max(Number(obj.paymentAmount || obj.testPrice || 100000), 100000);
    obj.testPrice = Math.max(Number(obj.testPrice || obj.paymentAmount || 100000), 100000);
    return obj;
  }

  async updateAll(data: Record<string, unknown>) {
    const entries = Object.entries(data || {});
    for (const [key, value] of entries) {
      await this.prisma.setting.upsert({ where: { key }, create: { key, value: value as any }, update: { value: value as any } });
    }
    return this.getAll();
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
      return { testPrice: Math.max(Number(paymentAmountRow.value), 100000) };
    }

    const row = await this.prisma.setting.findUnique({ where: { key: 'general' } });
    const value = (row?.value as any) || {};
    return { testPrice: Math.max(Number(value.paymentAmount || value.testPrice || 100000), 100000) };
  }

  async getGeneral() {
    const row = await this.prisma.setting.findUnique({ where: { key: 'general' } });
    const value = (row?.value as any) || { testPriceSettings: { basePrice: 100000 } };
    if (!value.testPriceSettings) {
      value.testPriceSettings = { basePrice: value.testPrice || 100000 };
    }
    value.testPriceSettings.basePrice = Math.max(Number(value.testPriceSettings.basePrice || value.testPrice || 100000), 100000);
    return value;
  }
}
