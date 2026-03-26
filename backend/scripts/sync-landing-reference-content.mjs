import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(backendRoot, '..');

const LANDING_KEYS = {
  global: 'landingGlobal',
  home: 'landingHome',
  companyProfile: 'landingCompanyProfile',
  services: 'landingServicePages',
  shop: 'landingShop',
  privacyPolicy: 'landingPrivacyPolicy',
  navigation: 'landingNavigation',
};

const logoSourceCandidates = [
  path.join(backendRoot, 'src', 'assets', 'seed-newme-class-logo.png'),
  path.join(backendRoot, 'uploads', 'content', 'seed-newme-class-logo.png'),
  path.join(
    repoRoot,
    'landingpage-cms-frontend',
    'src',
    'assets',
    '585f88d5e9a2256caa217475b070012672c11723.png',
  ),
];
const logoTargetDirectory = path.join(backendRoot, 'uploads', 'content');
const logoFileName = 'seed-newme-class-logo.png';
const logoTargetPath = path.join(logoTargetDirectory, logoFileName);
const logoUrl = `/uploads/content/${logoFileName}`;

const defaultNavigation = {
  mainLinks: [
    { label: 'Beranda', href: '/' },
    { label: 'Company Profile', href: '/company-profile' },
    { label: 'Shop', href: '/shop' },
    { label: 'Kontak', href: '/contact' },
  ],
  serviceLinks: [
    { label: 'Kelas Gali Bakat', href: '/services/personality-tests' },
    { label: 'NEWME Clinic', href: '/services/clinic' },
    { label: 'NEWME Class', href: '/services/class' },
    { label: 'NEWME Gallery', href: '/services/gallery' },
    { label: 'NEWME Net', href: '/services/net' },
  ],
  footerMenuLinks: [
    { label: 'Beranda', href: '/' },
    { label: 'Company Profile', href: '/company-profile' },
    { label: 'Layanan', href: '/services' },
    { label: 'Shop', href: '/shop' },
    { label: 'Artikel', href: '/articles' },
    { label: 'Kontak', href: '/contact' },
  ],
  footerServiceLinks: [
    { label: 'Kelas Gali Bakat', href: '/services/personality-tests' },
    { label: 'NEWME Clinic', href: '/services/clinic' },
    { label: 'NEWME Class', href: '/services/class' },
    { label: 'NEWME Net', href: '/services/net' },
  ],
  legalLinks: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Kontak', href: '/contact' },
  ],
  authLinks: {
    login: { label: 'Login', href: '/login' },
    register: { label: 'Daftar', href: '/register' },
  },
};

const defaultContent = {
  global: {
    siteName: 'NEWME CLASS',
    tagline: 'Kelas Peduli Talenta',
    phone: '0895.0267.1691',
    email: 'newmeclass@gmail.com',
    whatsapp: '6289502671691',
    address: 'Jl. Puskesmas I - Komp. Golden Seroja - A1, Medan',
    logoUrl,
    metaTitle: 'NEWME CLASS | Edukasi Jatidiri & Pengembangan Potensi',
    metaDescription:
      'NEWME CLASS adalah ekosistem pengembangan potensi diri untuk individu, yayasan, dan institusi melalui asesmen, kelas, konseling, komunitas, dan konten edukasi.',
    socialLinks: [
      { platform: 'instagram', url: 'https://instagram.com/newmeclass' },
      { platform: 'whatsapp', url: 'https://wa.me/6289502671691' },
      { platform: 'website', url: 'https://newmeclass.com' },
    ],
    maintenanceMode: false,
  },
  home: {
    hero: [
      {
        id: 'hero-1',
        subtitle: 'PT. MITRA SEMESTA EDUCLASS',
        title: 'Temukan Jatidiri dan Potensi Terbaikmu',
        desc: 'NEWME CLASS menghadirkan asesmen, kelas, dan pendampingan yang membantu individu maupun institusi mengenali bakat alami dan menumbuhkan potensi secara tepat.',
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80',
        ctaText: 'Lihat Layanan',
        ctaLink: '/services',
      },
      {
        id: 'hero-2',
        subtitle: 'KELAS PEDULI TALENTA',
        title: 'Asesmen, Kelas, dan Komunitas dalam Satu Ekosistem',
        desc: 'Dari NEWME Test sampai Kelas Gali Bakat, kami membangun perjalanan pengembangan diri yang lebih terarah, hangat, dan relevan dengan kebutuhan zaman.',
        image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80',
        ctaText: 'Mulai dari Tes Gratis',
        ctaLink: '/services/personality-tests',
      },
    ],
    about: {
      badge: 'Tentang Kami',
      title: 'Siapa Kami',
      description:
        'NEWME CLASS adalah brand dan produk dari PT. MITRA SEMESTA EDUCLASS yang bergerak di bidang edukasi jatidiri, pengembangan potensi, dan penguatan komunitas. Kami membantu individu, keluarga, sekolah, dan yayasan mendapatkan arah tumbuh yang lebih sesuai dengan bakat alami.',
      stats: [
        { label: 'Peserta', value: '5000+' },
        { label: 'Mitra', value: '50+' },
        { label: 'Program', value: '5' },
        { label: 'Kota', value: '20+' },
      ],
      image: 'https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1200&q=80',
    },
    services: [
      {
        id: 'service-home-1',
        title: 'Kelas Gali Bakat',
        subtitle: 'Program Unggulan · B2B',
        badge: 'Flagship',
        badgeTone: 'yellow',
        description: 'Program observasi bakat dan pendampingan untuk yayasan, sekolah, dan institusi pendidikan.',
        icon: 'GraduationCap',
        tags: ['Asesmen Massal', 'Psikolog Bersertifikasi', 'Sertifikat Resmi'],
        image: 'https://images.unsplash.com/photo-1773270196888-0cdacb07edae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3V0aCUyMHRhbGVudCUyMGRldmVsb3BtZW50JTIwd29ya3Nob3B8ZW58MXx8fHwxNzc0MTk2NzgwfDA&ixlib=rb-4.1.0&q=80&w=1080',
        iconTone: 'yellow',
        link: '/services/personality-tests',
        enabled: true,
        type: 'b2b',
      },
      {
        id: 'service-home-2',
        title: 'NEWME Clinic',
        subtitle: 'Konsultasi Psikologi · B2C',
        badge: 'Licensed',
        badgeTone: 'emerald',
        description: 'Pendampingan personal melalui sesi konsultasi dan arahan pengembangan diri.',
        icon: 'Stethoscope',
        tags: ['Online / Offline', 'Konseling Pribadi', 'Follow-up 7 Hari'],
        image: 'https://images.unsplash.com/photo-1761039808159-f02b58f07032?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBjb2FjaGluZyUyMHNlc3Npb258ZW58MXx8fHwxNzc0MTk2NzgwfDA&ixlib=rb-4.1.0&q=80&w=1080',
        iconTone: 'emerald',
        link: '/services/clinic',
        enabled: true,
        type: 'b2c',
      },
      {
        id: 'service-home-3',
        title: 'NEWME Class',
        subtitle: 'Kursus & Webinar · B2C',
        badge: 'Best Seller',
        badgeTone: 'blue',
        description: 'Kursus pengembangan diri dan webinar interaktif bersama ahli psikologi terbaik.',
        icon: 'GraduationCap',
        tags: ['12+ Kursus', 'Webinar Rutin', 'Sertifikat Digital'],
        image: 'https://images.unsplash.com/photo-1545886082-e66c6b9e011a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWxlbnQlMjBkaXNjb3ZlcnklMjB5b3V0aCUyMHByb2dyYW18ZW58MXx8fHwxNzc0MTk5MzM2fDA&ixlib=rb-4.1.0&q=80&w=1080',
        iconTone: 'blue',
        link: '/services/class',
        enabled: true,
        type: 'b2c',
      },
      {
        id: 'service-home-4',
        title: 'NEWME Gallery',
        subtitle: 'Dokumentasi & Media',
        badge: 'Media',
        badgeTone: 'purple',
        description: 'Galeri foto dan video kegiatan dari seluruh program NEWME.',
        icon: 'ImageIcon',
        tags: ['Foto Kegiatan', 'Video Testimonial', 'Highlight Events'],
        image: 'https://images.unsplash.com/photo-1761054783454-7bf31f4d0d25?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxldmVudCUyMGdhbGxlcnklMjBwaG90byUyMGRvY3VtZW50YXRpb258ZW58MXx8fHwxNzc0MTk5MzM2fDA&ixlib=rb-4.1.0&q=80&w=1080',
        iconTone: 'purple',
        link: '/services/gallery',
        enabled: true,
        type: 'b2b',
      },
      {
        id: 'service-home-5',
        title: 'NEWME Net',
        subtitle: 'Komunitas & Networking',
        badge: 'New',
        badgeTone: 'orange',
        description: 'Ekosistem membership eksklusif dengan diskon program, networking event, dan komunitas aktif.',
        icon: 'Network',
        tags: ['Diskon s/d 30%', 'Networking Event', 'Priority Access'],
        image: 'https://images.unsplash.com/photo-1728933102332-a4f1a281a621?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0ZWFtJTIwY29sbGFib3JhdGlvbiUyMHdvcmtzaG9wJTIwc2VtaW5hcnxlbnwxfHx8fDE3NzQyMDAzMzl8MA&ixlib=rb-4.1.0&q=80&w=1080',
        iconTone: 'orange',
        link: '/services/net',
        enabled: true,
        type: 'b2b',
      },
    ],
    promo: {
      badge: 'GRATIS',
      title: '5 Test Dasar Gratis dari NEWME',
      subtitle: 'Observasi mandiri untuk mengenal bakat dan arah tumbuh Anda.',
      description:
        'Daftar akun Anda dan nikmati akses ke 5 test dasar gratis sebagai langkah awal mengenali karakter, minat, dan bakat alami.',
      tests: [
        'Test Kepribadian Dasar',
        'Test Minat Dasar',
        'Test Bakat Dasar',
        'Hasil Instan',
        'Rekomendasi Awal',
      ],
      image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
      ctaText: 'Daftar & Mulai Tes',
      ctaLink: '/register',
      enabled: true,
    },
    testimonials: [
      {
        id: 'testimonial-1',
        name: 'Tim Yayasan Mitra',
        role: 'Partner Institusi',
        text: 'Program NEWME membantu kami membaca potensi siswa secara lebih terarah dan mudah ditindaklanjuti oleh guru.',
        avatar: '',
        rating: 5,
      },
      {
        id: 'testimonial-2',
        name: 'Peserta NEWME Test',
        role: 'User Premium',
        text: 'Hasil test terasa lebih mudah dipahami dan memberi gambaran yang jelas untuk langkah pengembangan diri saya.',
        avatar: '',
        rating: 5,
      },
      {
        id: 'testimonial-3',
        name: 'Orang Tua Siswa',
        role: 'Client',
        text: 'Saya jadi lebih paham bagaimana mendampingi anak sesuai bakat alaminya, bukan sekadar mengikuti arus umum.',
        avatar: '',
        rating: 5,
      },
    ],
    benefits: [
      {
        id: 'benefit-1',
        title: 'Lebih Kenal Diri dan Potensi',
        description: 'Membantu peserta memahami kecenderungan alami sehingga proses belajar dan tumbuh menjadi lebih tepat arah.',
        icon: 'Sparkles',
      },
      {
        id: 'benefit-2',
        title: 'Nyaman dengan Gaya Jatidiri',
        description: 'Mendorong peserta memilih aktivitas, pola belajar, dan lingkungan yang lebih sesuai dengan dirinya.',
        icon: 'Heart',
      },
      {
        id: 'benefit-3',
        title: 'Akselerasi Meraih Impian',
        description: 'Dengan peta diri yang lebih jelas, peserta dapat menyusun langkah pengembangan secara lebih realistis dan terukur.',
        icon: 'Target',
      },
      {
        id: 'benefit-4',
        title: 'Akses Produk Komunitas',
        description: 'Member mendapatkan akses ke ekosistem NEWME seperti kegiatan komunitas, update program, dan benefit lainnya.',
        icon: 'Users',
      },
      {
        id: 'benefit-5',
        title: 'Benefit dari Mitra NEWME',
        description: 'Kolaborasi dengan mitra dan merchant membuka peluang bonus, diskon, reward, dan pengalaman belajar yang lebih luas.',
        icon: 'Star',
      },
    ],
    activities: [
      {
        id: 'activity-1',
        title: 'Observasi Potensi di Sekolah Mitra',
        date: 'Program Institusi',
        image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
        description: 'Pelaksanaan observasi bakat dan karakter belajar untuk siswa bersama yayasan dan sekolah mitra.',
      },
      {
        id: 'activity-2',
        title: 'Sesi Konsultasi & Pendampingan',
        date: 'Program Clinic',
        image: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?auto=format&fit=crop&w=1200&q=80',
        description: 'Pendampingan personal untuk membantu peserta merencanakan arah belajar, karier, dan pengembangan diri.',
      },
      {
        id: 'activity-3',
        title: 'Komunitas & Kelas Kolaboratif',
        date: 'Program Community',
        image: 'https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&w=1200&q=80',
        description: 'Aktivitas komunitas, kelas, dan forum kolaborasi yang menguatkan jejaring belajar di ekosistem NEWME.',
      },
    ],
    visiMisi: {
      visi: 'Menjadi bagian dari kemajuan bangsa melalui edukasi jatidiri di berbagai lembaga, institusi, dan komunitas di Indonesia.',
      misi: [
        'Membangun kemitraan strategis dengan lembaga pendidikan, yayasan, institusi, dan masyarakat luas.',
        'Menghadirkan asesmen, kelas, dan pendampingan yang relevan dengan bakat alami peserta.',
        'Menjadi mitra yang mendorong capaian visi dan misi klien melalui pendekatan edukasi yang lebih personal.',
      ],
      values: [
        { title: 'Peduli Talenta', desc: 'Fokus pada potensi unik setiap individu.' },
        { title: 'Kolaboratif', desc: 'Tumbuh bersama yayasan, keluarga, dan komunitas.' },
        { title: 'Berdampak', desc: 'Mendorong aksi nyata, bukan sekadar hasil di atas kertas.' },
      ],
    },
    banners: [
      {
        id: 'banner-1',
        title: 'Siap mulai mengenal potensi diri dengan lebih terarah?',
        subtitle: 'Mulai dari test gratis lalu lanjutkan ke program yang paling sesuai untuk Anda atau institusi Anda.',
        image: '',
        ctaText: 'Coba Tes Gratis',
        ctaLink: '/services/personality-tests',
        enabled: true,
      },
      {
        id: 'banner-2',
        title: 'Butuh program untuk yayasan atau sekolah?',
        subtitle: 'Diskusikan kebutuhan observasi, kelas, dan pendampingan bersama tim NEWME.',
        image: '',
        ctaText: 'Hubungi Kami',
        ctaLink: '/contact',
        enabled: true,
      },
    ],
    finalCta: {
      title: 'Mulai Kenali Arah dan Potensi Anda',
      subtitle: 'Bangun langkah pengembangan diri yang lebih jelas bersama ekosistem NEWME CLASS.',
      ctaText: 'Buat Akun Sekarang',
      ctaLink: '/register',
    },
    ecosystemItems: [
      {
        id: 'ecosystem-1',
        title: 'NEWME Test',
        subtitle: 'Asesmen Dasar',
        desc: 'Pintu masuk terbaik untuk memahami potensi, minat, dan kecenderungan diri.',
        badge: 'Popular',
        icon: 'TestTube',
        image: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
        href: '/services/personality-tests',
        color: 'from-yellow-500/80 to-amber-500/70',
        enabled: true,
      },
      {
        id: 'ecosystem-2',
        title: 'NEWME Clinic',
        subtitle: 'Pendampingan Personal',
        desc: 'Sesi konsultasi untuk membantu pengguna mengambil langkah yang lebih sadar dan sesuai kebutuhan.',
        badge: 'B to C',
        icon: 'Stethoscope',
        image: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?auto=format&fit=crop&w=1200&q=80',
        href: '/services/clinic',
        color: 'from-emerald-500/80 to-teal-500/70',
        enabled: true,
      },
      {
        id: 'ecosystem-3',
        title: 'Kelas Gali Bakat',
        subtitle: 'Program Institusi',
        desc: 'Program kelas dan observasi untuk sekolah, yayasan, dan komunitas belajar.',
        badge: 'B to B',
        icon: 'GraduationCap',
        image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
        href: '/services/class',
        color: 'from-blue-500/80 to-indigo-500/70',
        enabled: true,
      },
      {
        id: 'ecosystem-4',
        title: 'NEWME Gallery',
        subtitle: 'Dokumentasi',
        desc: 'Ruang untuk melihat perjalanan, cerita, dan dokumentasi tumbuh bersama NEWME.',
        badge: 'Community',
        icon: 'ImageIcon',
        image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
        href: '/services/gallery',
        color: 'from-purple-500/80 to-fuchsia-500/70',
        enabled: true,
      },
      {
        id: 'ecosystem-5',
        title: 'NEWME Net',
        subtitle: 'Jejaring & Komunitas',
        desc: 'Jejaring yang memperluas koneksi, benefit, dan kolaborasi lintas member dan mitra.',
        badge: 'Network',
        icon: 'Network',
        image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80',
        href: '/services/net',
        color: 'from-orange-500/80 to-amber-500/70',
        enabled: true,
      },
    ],
  },
  companyProfile: {
    name: 'NEWME CLASS',
    legalName: 'PT. MITRA SEMESTA EDUCLASS',
    foundedYear: '2024',
    description:
      'NEWME CLASS adalah ekosistem edukasi jatidiri yang lahir untuk membantu individu, sekolah, yayasan, dan komunitas memahami potensi alami secara lebih utuh. Kami memadukan asesmen, kelas, pendampingan, dan jejaring kolaborasi agar proses tumbuh menjadi lebih bermakna dan terarah.',
    vision:
      'Menjadi bagian dari kemajuan bangsa melalui edukasi jatidiri di berbagai lembaga, institusi, organisasi, dan komunitas di negeri tercinta.',
    mission: [
      'Membangun kemitraan edukasi jatidiri yang strategis dengan stakeholder dunia pendidikan, lembaga, institusi, dan masyarakat luas.',
      'Menghadirkan program observasi, kelas, dan pendampingan yang relevan dengan bakat dan kebutuhan nyata peserta.',
      'Menjadi mitra pendorong capaian visi dan misi klien dengan pendekatan yang berdampak dan berkelanjutan.',
    ],
    teamMembers: [
      {
        id: 'team-1',
        name: 'Direksi NEWME',
        role: 'Board of Directors',
        image: '',
        bio: 'Tim strategis yang mengarahkan pertumbuhan, kemitraan, dan kualitas layanan NEWME CLASS.',
      },
      {
        id: 'team-2',
        name: 'Head of Program',
        role: 'Program Development',
        image: '',
        bio: 'Mengembangkan kurikulum, rancangan observasi, dan alur pendampingan untuk berbagai segmen layanan.',
      },
      {
        id: 'team-3',
        name: 'Partnership Support',
        role: 'Institution Relation',
        image: '',
        bio: 'Mendampingi kebutuhan kerja sama dengan yayasan, sekolah, dan institusi mitra.',
      },
      {
        id: 'team-4',
        name: 'Community Support',
        role: 'Member Experience',
        image: '',
        bio: 'Menjaga pengalaman belajar, komunikasi, dan keberlanjutan ekosistem komunitas NEWME.',
      },
    ],
  },
  services: {
    servicePages: [
      {
        id: 'service-overview',
        slug: 'services',
        title: 'Ekosistem Layanan NEWME',
        subtitle: 'Layanan untuk individu, keluarga, sekolah, yayasan, dan komunitas.',
        heroImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80',
        description:
          'Lima layanan NEWME saling terhubung untuk membantu proses mengenal diri, mengoptimalkan potensi, dan memperluas jejaring tumbuh.',
        features: [
          { title: 'Asesmen Awal', desc: 'Membantu membaca potensi dan kecenderungan dasar peserta.' },
          { title: 'Program Kelas', desc: 'Pendampingan lanjutan melalui kelas dan observasi terstruktur.' },
          { title: 'Konsultasi Personal', desc: 'Ruang aman untuk diskusi dan pemetaan langkah berikutnya.' },
          { title: 'Jejaring Komunitas', desc: 'Benefit, kolaborasi, dan ruang belajar bersama dalam ekosistem NEWME.' },
        ],
        pricing: [],
        enabled: true,
      },
      {
        id: 'service-test',
        slug: 'personality-tests',
        title: 'Kelas Gali Bakat',
        subtitle: 'Program terstruktur untuk membantu menemukan dan mengembangkan bakat alami peserta.',
        heroImage: 'https://images.unsplash.com/photo-1545886082-e66c6b9e011a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWxlbnQlMjBkaXNjb3ZlcnklMjB5b3V0aCUyMHByb2dyYW18ZW58MXx8fHwxNzc0MTk5MzM2fDA&ixlib=rb-4.1.0&q=80&w=1080',
        heroBadge: 'PROGRAM UNGGULAN',
        heroPrimaryCtaText: 'Hubungi Tim NEWME',
        heroPrimaryCtaLink: '/contact',
        heroSecondaryCtaText: 'Coba NEWME Test',
        heroSecondaryCtaLink: '/register',
        description:
          'Program ini dirancang untuk sekolah, yayasan, dan komunitas yang ingin menggali bakat alami peserta secara lebih terstruktur dan bermakna.',
        introTitle: 'Apa itu Kelas Gali Bakat?',
        introParagraphs: [
          'Kelas Gali Bakat adalah program asesmen dan pengembangan potensi yang dirancang untuk menggali bakat alami setiap individu menggunakan pendekatan psikologi modern.',
          'Program ini dijalankan bersama institusi pendidikan dalam bentuk event yang terstruktur, dengan tahapan yang jelas dari proses awal hingga pendampingan berkelanjutan.',
          'Program ini penting karena setiap individu memiliki potensi unik yang seringkali tidak disadari. Dengan asesmen yang tepat dan pendampingan profesional, bakat terpendam dapat ditemukan dan dikembangkan secara optimal.',
        ],
        features: [
          { title: 'Asesmen Massal', desc: 'Cocok untuk sekolah, yayasan, dan institusi pendidikan.' },
          { title: 'Psikolog Bersertifikasi', desc: 'Dipandu pendekatan observasi dan analisis profesional.' },
          { title: 'Pendampingan Lanjutan', desc: 'Insight tidak berhenti di hasil, tetapi diteruskan ke program optimasi.' },
          { title: 'Sertifikat Resmi', desc: 'Memberi nilai tambah bagi peserta maupun institusi.' },
        ],
        pricing: [
          {
            name: 'Program Institusi',
            price: 'Hubungi Admin',
            features: ['observasi siswa', 'profiling bakat', 'pendampingan institusi', 'sertifikat resmi'],
          },
        ],
        phases: [
          { title: 'Registrasi & Asesmen Awal', desc: 'Peserta mendaftar dan mengikuti asesmen dasar untuk mengukur baseline potensi.' },
          { title: 'Observasi & Gali Bakat', desc: 'Tim psikolog melakukan observasi intensif dan serangkaian tes untuk menggali bakat terpendam.' },
          { title: 'Analisis & Profiling', desc: 'Data asesmen dianalisis untuk menghasilkan profil bakat unik setiap peserta.' },
          { title: 'Pendampingan & Konseling', desc: 'Setiap peserta mendapat pendampingan personal untuk memahami dan menerima profil bakatnya.' },
          { title: 'Kelas Optimasi Potensi', desc: 'Program lanjutan untuk mengoptimalkan bakat yang telah ditemukan melalui kelas-kelas terstruktur.' },
        ],
        galiBakatBenefits: [
          { title: 'Kenali Potensi Tersembunyi', desc: 'Temukan bakat alami yang belum pernah Anda sadari sebelumnya melalui asesmen komprehensif.' },
          { title: 'Arah yang Jelas', desc: 'Dapatkan peta jalan yang jelas untuk pengembangan diri berdasarkan profil unik Anda.' },
          { title: 'Dibimbing Ahli', desc: 'Didampingi langsung oleh psikolog dan mentor berpengalaman di bidangnya.' },
          { title: 'Sertifikat Resmi', desc: 'Dapatkan sertifikat program yang dapat diverifikasi secara digital.' },
          { title: 'Self-Acceptance', desc: 'Belajar menerima dan menghargai keunikan diri sendiri sebagai langkah awal pengembangan.' },
          { title: 'Akselerasi Impian', desc: 'Percepat perjalanan menuju impian dengan strategi yang tepat sasaran.' },
        ],
        optimasiItems: [
          'Kurikulum personal berdasarkan profil bakat',
          'Mentoring 1-on-1 dengan psikolog',
          'Project-based learning',
          'Evaluasi berkala & laporan perkembangan',
        ],
        enabled: true,
      },
      {
        id: 'service-clinic',
        slug: 'clinic',
        title: 'NEWME Clinic',
        subtitle: 'Pendampingan personal untuk langkah pengembangan diri yang lebih jelas.',
        heroImage: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?auto=format&fit=crop&w=1400&q=80',
        heroBadge: 'NEWME CLINIC',
        heroPrimaryCtaText: 'Booking Sekarang',
        heroPrimaryCtaLink: '/contact',
        heroSecondaryCtaText: 'Lihat Psikolog',
        heroSecondaryCtaLink: '/contact',
        description:
          'NEWME Clinic menyediakan sesi konsultasi personal yang membantu peserta memetakan kebutuhan, menyusun prioritas, dan mengambil langkah tumbuh yang lebih sadar.',
        introTitle: 'Konsultasi Psikologi',
        introParagraphs: [
          'Sesi konsultasi bersama psikolog profesional bersertifikasi untuk membantu Anda memahami tantangan, potensi, dan arah pengembangan diri.',
        ],
        features: [
          { title: 'Konsultasi Terarah', desc: 'Sesi yang fokus pada kebutuhan peserta, bukan template yang seragam.' },
          { title: 'Online & Offline', desc: 'Fleksibel mengikuti kebutuhan dan kenyamanan peserta.' },
          { title: 'Topik Kontekstual', desc: 'Membahas pendidikan, karier, minat, dan dinamika tumbuh personal.' },
          { title: 'Rencana Lanjut', desc: 'Membantu peserta menerjemahkan insight menjadi langkah praktis.' },
        ],
        pricing: [
          {
            name: 'Sesi Personal',
            price: 'Hubungi Admin',
            features: ['durasi 60-90 menit', 'online/offline', 'jadwal fleksibel'],
          },
        ],
        consultTypes: [
          {
            title: 'Konsultasi Diri & Potensi',
            subtitle: 'Untuk remaja, mahasiswa, dan individu',
            desc: 'Membantu peserta memahami pola dirinya, potensi inti, dan keputusan pengembangan yang lebih tepat.',
            duration: '60 menit',
            mode: 'Online / Offline',
            topics: ['potensi diri', 'arah belajar', 'kepercayaan diri'],
            price: 'Hubungi Admin',
            icon: 'Stethoscope',
            theme: 'emerald',
          },
          {
            title: 'Konsultasi Karier & Pendidikan',
            subtitle: 'Untuk orang tua dan peserta yang sedang memilih arah',
            desc: 'Pendampingan untuk membaca pilihan belajar, minat, dan prioritas keputusan yang sedang dihadapi.',
            duration: '90 menit',
            mode: 'Online / Offline',
            topics: ['jurusan', 'karier', 'pengambilan keputusan'],
            price: 'Hubungi Admin',
            icon: 'Brain',
            theme: 'yellow',
          },
        ],
        psychologists: [
          { id: 'clinic-psy-1', name: 'Tim Konsultan NEWME', specialty: 'Pendampingan Potensi', rating: 5, sessions: 150, initials: 'TN' },
          { id: 'clinic-psy-2', name: 'Mentor Program NEWME', specialty: 'Pemetaan Arah Belajar', rating: 5, sessions: 120, initials: 'MP' },
        ],
        clinicFeatures: [
          { title: 'Ruang Diskusi Aman', desc: 'Pendekatan hangat dan terarah.' },
          { title: 'Data Lebih Bermakna', desc: 'Insight dari hasil test dapat dibahas lebih lanjut.' },
          { title: 'Pendampingan Praktis', desc: 'Fokus pada langkah nyata yang bisa dilakukan.' },
          { title: 'Cocok untuk Individu & Orang Tua', desc: 'Fleksibel untuk berbagai kebutuhan.' },
        ],
        enabled: true,
      },
      {
        id: 'service-class',
        slug: 'class',
        title: 'NEWME Class',
        subtitle: 'Kelas pengembangan diri, kursus minat bakat, dan webinar interaktif bersama para ahli.',
        heroImage: 'https://images.unsplash.com/photo-1545886082-e66c6b9e011a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWxlbnQlMjBkaXNjb3ZlcnklMjB5b3V0aCUyMHByb2dyYW18ZW58MXx8fHwxNzc0MTk5MzM2fDA&ixlib=rb-4.1.0&q=80&w=1080',
        heroBadge: 'NEWME CLASS',
        heroPrimaryCtaText: 'Daftar Kursus',
        heroPrimaryCtaLink: '/register',
        heroSecondaryCtaText: 'Hubungi Admin',
        heroSecondaryCtaLink: '/contact',
        description:
          'NEWME Class menghadirkan kursus dan webinar yang dirancang untuk membantu peserta mengembangkan diri secara praktis, terarah, dan relevan dengan kebutuhan masa kini.',
        classHighlights: [
          { icon: 'BookOpen', label: '12+ Kursus', desc: 'Online & Offline' },
          { icon: 'Video', label: 'Webinar Rutin', desc: 'Setiap Minggu' },
          { icon: 'Award', label: 'Sertifikat', desc: 'Resmi & Terverifikasi' },
          { icon: 'Users', label: '5000+ Alumni', desc: 'Komunitas Aktif' },
        ],
        features: [
          { title: 'Kursus Terstruktur', desc: 'Materi dirancang agar mudah dipahami dan relevan untuk pengembangan diri.' },
          { title: 'Webinar Interaktif', desc: 'Sesi langsung bersama mentor dan pembicara berpengalaman.' },
          { title: 'Sertifikat Digital', desc: 'Peserta mendapatkan bukti partisipasi yang dapat diverifikasi.' },
          { title: 'Komunitas Aktif', desc: 'Belajar tidak berhenti di kelas, tetapi berlanjut ke jejaring member.' },
        ],
        pricing: [],
        courses: [
          {
            id: 'course-1',
            title: 'Mengenal Kepribadianmu',
            instructor: 'Dr. Maya Sari, M.Psi',
            duration: '8 Jam',
            students: 1250,
            rating: 4.9,
            price: 'Rp 199.000',
            badge: 'Best Seller',
            image: 'https://images.unsplash.com/photo-1647013302881-3f19103fd9f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXJzb25hbGl0eSUyMHBzeWNob2xvZ3klMjBhc3Nlc3NtZW50fGVufDF8fHx8MTc3NDE5Njc4MXww&ixlib=rb-4.1.0&q=80&w=1080',
          },
          {
            id: 'course-2',
            title: 'Career Mapping Masterclass',
            instructor: 'Andi Pratama, M.Psi',
            duration: '6 Jam',
            students: 890,
            rating: 4.8,
            price: 'Rp 249.000',
            badge: 'Popular',
            image: 'https://images.unsplash.com/photo-1762330917056-e69b34329ddf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvbmxpbmUlMjBjb3Vyc2UlMjBlZHVjYXRpb24lMjBwbGF0Zm9ybXxlbnwxfHx8fDE3NzQxOTkzMzR8MA&ixlib=rb-4.1.0&q=80&w=1080',
          },
          {
            id: 'course-3',
            title: 'Gali Bakat Terpendam',
            instructor: 'Sinta Dewi, M.Psi',
            duration: '10 Jam',
            students: 650,
            rating: 4.9,
            price: 'Rp 299.000',
            badge: 'New',
            image: 'https://images.unsplash.com/photo-1545886082-e66c6b9e011a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0YWxlbnQlMjBkaXNjb3ZlcnklMjB5b3V0aCUyMHByb2dyYW18ZW58MXx8fHwxNzc0MTk5MzM2fDA&ixlib=rb-4.1.0&q=80&w=1080',
          },
          {
            id: 'course-4',
            title: 'Self-Awareness 101',
            instructor: 'Dr. Rina Handayani',
            duration: '4 Jam',
            students: 2100,
            rating: 4.7,
            price: 'Gratis',
            badge: 'Free',
            image: 'https://images.unsplash.com/photo-1760346546771-a81d986459ff?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Jwb3JhdGUlMjB0ZWFtJTIwbWVldGluZyUyMHByb2Zlc3Npb25hbHxlbnwxfHx8fDE3NzQxODEzNjF8MA&ixlib=rb-4.1.0&q=80&w=1080',
          },
        ],
        webinars: [
          { id: 'webinar-1', title: 'Webinar: Menemukan Passion di Era Digital', date: '28 Mar 2026', time: '19:00 WIB', speaker: 'Dr. Maya Sari', spots: 45, price: 'Gratis' },
          { id: 'webinar-2', title: 'Webinar: Career Switch di Usia 30an', date: '5 Apr 2026', time: '19:00 WIB', speaker: 'Andi Pratama, M.Psi', spots: 30, price: 'Rp 50.000' },
          { id: 'webinar-3', title: 'Webinar: Parenting & Bakat Anak', date: '12 Apr 2026', time: '10:00 WIB', speaker: 'Sinta Dewi, M.Psi', spots: 60, price: 'Gratis' },
        ],
        enabled: true,
      },
      {
        id: 'service-gallery',
        slug: 'gallery',
        title: 'NEWME Gallery',
        subtitle: 'Dokumentasi aktivitas, testimoni, dan jejak proses tumbuh di ekosistem NEWME.',
        heroImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80',
        heroBadge: 'NEWME GALLERY',
        description:
          'NEWME Gallery menampilkan dokumentasi kegiatan, cerita peserta, dan momen kolaborasi yang memperlihatkan wajah nyata ekosistem NEWME di lapangan.',
        features: [
          { title: 'Dokumentasi Kegiatan', desc: 'Menghadirkan momen kelas, observasi, dan kolaborasi institusi.' },
          { title: 'Cerita Tumbuh', desc: 'Merekam pengalaman belajar dan insight yang lahir dari perjalanan peserta.' },
          { title: 'Bahan Presentasi Program', desc: 'Membantu calon mitra memahami pendekatan NEWME secara visual.' },
        ],
        pricing: [],
        galleryPhotos: [
          { id: 'gallery-photo-1', src: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80', caption: 'Observasi kelas bersama sekolah mitra', category: 'Program' },
          { id: 'gallery-photo-2', src: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80', caption: 'Kolaborasi komunitas dan jejaring belajar', category: 'Komunitas' },
          { id: 'gallery-photo-3', src: 'https://images.unsplash.com/photo-1515169067868-5387ec356754?auto=format&fit=crop&w=1200&q=80', caption: 'Momen diskusi dan refleksi peserta', category: 'Pendampingan' },
        ],
        galleryVideos: [
          { id: 'gallery-video-1', title: 'Highlight Program Institusi', speaker: 'Tim NEWME', duration: '03:20', category: 'Highlight' },
          { id: 'gallery-video-2', title: 'Cerita Tumbuh Peserta', speaker: 'Peserta Program', duration: '02:10', category: 'Testimoni' },
        ],
        enabled: true,
      },
      {
        id: 'service-net',
        slug: 'net',
        title: 'NEWME Net',
        subtitle: 'Jejaring komunitas, benefit member, dan kolaborasi berkelanjutan.',
        heroImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80',
        heroBadge: 'NEWME NET',
        heroPrimaryCtaText: 'Gabung Sekarang',
        heroPrimaryCtaLink: '/contact',
        description:
          'NEWME Net memperkuat hubungan antar member, mitra, dan ekosistem NEWME agar pertumbuhan peserta tidak berhenti setelah test atau kelas selesai.',
        features: [
          { title: 'Komunitas Aktif', desc: 'Ruang bertemu, belajar, dan bertumbuh bersama.' },
          { title: 'Benefit Kolaboratif', desc: 'Akses benefit dari mitra, merchant, atau program komunitas.' },
          { title: 'Arah Lanjutan', desc: 'Peserta tetap terhubung dengan peluang kelas, kegiatan, dan jejaring baru.' },
        ],
        pricing: [
          {
            name: 'Keanggotaan Komunitas',
            price: 'Hubungi Admin',
            features: ['akses komunitas', 'info event', 'update program', 'jejaring member'],
          },
        ],
        netBenefits: [
          { icon: 'Users', title: 'Ruang Bertumbuh Bersama', desc: 'Tempat belajar dan berbagi pengalaman dengan member lain.' },
          { icon: 'Star', title: 'Benefit Member', desc: 'Akses ke promo, merchant partner, dan program kolaboratif.' },
          { icon: 'Sparkles', title: 'Koneksi yang Relevan', desc: 'Jejaring yang mendukung langkah belajar dan pengembangan diri.' },
        ],
        memberPlans: [
          { name: 'Basic', price: 'Gratis', period: '', features: ['Akses komunitas online', 'Newsletter bulanan', '1x networking event/tahun'], highlight: false },
          { name: 'Gold', price: 'Rp 99K', period: '/bulan', features: ['Semua benefit Basic', 'Diskon 15% semua program', 'Merchant partner access', '4x networking event/tahun', 'Priority registration'], highlight: true },
          { name: 'Platinum', price: 'Rp 199K', period: '/bulan', features: ['Semua benefit Gold', 'Diskon 30% semua program', '1-on-1 mentoring/bulan', 'Unlimited networking event', 'VIP event access', 'Sertifikat premium'], highlight: false },
        ],
        enabled: true,
      },
    ],
  },
  shop: {
    products: [
      {
        id: 'shop-1',
        name: 'Workbook Gali Potensi',
        price: 89000,
        category: 'Workbook',
        image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80',
        badge: 'Best Seller',
        desc: 'Workbook pendamping untuk membantu peserta merefleksikan hasil observasi dan rencana pengembangan diri.',
        rating: 5,
        reviews: 12,
        stock: 25,
        enabled: true,
      },
      {
        id: 'shop-2',
        name: 'Jurnal Refleksi NEWME',
        price: 69000,
        category: 'Merchandise',
        image: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=1200&q=80',
        badge: 'New',
        desc: 'Jurnal sederhana untuk mencatat insight, kebiasaan, dan proses tumbuh harian.',
        rating: 5,
        reviews: 8,
        stock: 30,
        enabled: true,
      },
      {
        id: 'shop-3',
        name: 'Starter Kit Komunitas',
        price: 149000,
        category: 'Starter Kit',
        image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80',
        badge: 'Community',
        desc: 'Paket perlengkapan awal untuk member yang ingin memulai perjalanan belajar bersama NEWME.',
        rating: 4.9,
        reviews: 5,
        stock: 15,
        enabled: true,
      },
      {
        id: 'shop-4',
        name: 'Panduan Arah Belajar',
        price: 49000,
        category: 'Digital Guide',
        image: 'https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=1200&q=80',
        badge: 'Digital',
        desc: 'Panduan ringkas untuk membantu peserta menyusun prioritas belajar setelah memahami hasil test awal.',
        rating: 5,
        reviews: 10,
        stock: 999,
        enabled: true,
      },
    ],
    shopCategories: [
      { id: 'category-1', name: 'Workbook', slug: 'workbook' },
      { id: 'category-2', name: 'Merchandise', slug: 'merchandise' },
      { id: 'category-3', name: 'Starter Kit', slug: 'starter-kit' },
      { id: 'category-4', name: 'Digital Guide', slug: 'digital-guide' },
    ],
    discountCodes: [],
  },
  privacyPolicy: {
    lastUpdated: '2026-03-23',
    sections: [
      {
        id: 'privacy-1',
        title: 'Pendahuluan',
        content:
          'NEWME CLASS berkomitmen melindungi privasi pengguna. Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan menjaga informasi ketika Anda memakai layanan kami.',
      },
      {
        id: 'privacy-2',
        title: 'Informasi yang Kami Kumpulkan',
        content:
          'Kami dapat mengumpulkan nama, email, nomor telepon, tanggal lahir, alamat, informasi pendidikan, jawaban test, hasil asesmen, serta data teknis seperti alamat IP dan perangkat yang digunakan.',
      },
      {
        id: 'privacy-3',
        title: 'Informasi Test dan Assessment',
        content:
          'Saat Anda mengikuti test atau assessment, kami memproses jawaban, hasil pengukuran, profil kepribadian, minat, bakat, dan rekomendasi pengembangan untuk menampilkan layanan secara relevan.',
      },
      {
        id: 'privacy-4',
        title: 'Informasi Pembayaran',
        content:
          'Untuk transaksi berbayar, kami bekerja sama dengan payment gateway dan tidak menyimpan informasi kartu kredit secara langsung di sistem kami.',
      },
      {
        id: 'privacy-5',
        title: 'Bagaimana Informasi Digunakan',
        content:
          'Informasi digunakan untuk menyediakan layanan, memproses registrasi dan pembayaran, memberikan hasil test, meningkatkan kualitas layanan, mengirim pemberitahuan, dan memenuhi kewajiban hukum.',
      },
      {
        id: 'privacy-6',
        title: 'Berbagi Informasi',
        content:
          'Kami tidak menjual data pribadi pengguna. Data hanya dibagikan bila diperlukan untuk penyedia layanan, kewajiban hukum, keamanan sistem, atau atas persetujuan pengguna.',
      },
      {
        id: 'privacy-7',
        title: 'Keamanan Data',
        content:
          'Kami menerapkan langkah teknis dan organisasi yang wajar, termasuk kontrol akses, pemantauan, backup, dan perlindungan sistem untuk mengurangi risiko akses yang tidak sah.',
      },
      {
        id: 'privacy-8',
        title: 'Hak Pengguna',
        content:
          'Pengguna dapat meminta akses, koreksi, pembatasan, atau penghapusan data sesuai kebutuhan dan ketentuan yang berlaku dengan menghubungi tim NEWME CLASS.',
      },
      {
        id: 'privacy-9',
        title: 'Cookies dan Data Teknis',
        content:
          'Kami dapat menggunakan cookies atau teknologi serupa untuk meningkatkan pengalaman, menganalisis penggunaan layanan, dan menjaga stabilitas aplikasi.',
      },
      {
        id: 'privacy-10',
        title: 'Kontak',
        content:
          'Pertanyaan mengenai privasi dapat dikirim ke newmeclass@gmail.com, WhatsApp +62 895-0267-1691, atau melalui halaman kontak resmi NEWME CLASS.',
      },
    ],
  },
  navigation: defaultNavigation,
};

const defaultArticles = [
  {
    slug: 'mengenal-bakat-alami-sejak-dini',
    title: 'Mengenal Bakat Alami Sejak Dini',
    summary: 'Langkah awal membantu anak dan remaja memahami potensi yang paling alami dalam dirinya.',
    excerpt: 'Mengenal bakat alami sejak dini membantu peserta, orang tua, dan pendidik mengambil langkah pendampingan yang lebih tepat.',
    category: 'Pengembangan Diri',
    content: 'Observasi bakat alami sejak dini membantu proses tumbuh menjadi lebih terarah.',
    featuredImage: 'https://images.unsplash.com/photo-1503676382389-4809596d5290?auto=format&fit=crop&w=1200&q=80',
    isPublished: true,
  },
  {
    slug: 'langkah-awal-memilih-jurusan-dan-arah-belajar',
    title: 'Langkah Awal Memilih Jurusan dan Arah Belajar',
    summary: 'Memilih jurusan akan terasa lebih ringan bila dimulai dari pemahaman diri, bukan tekanan lingkungan.',
    excerpt: 'Keputusan jurusan dan arah belajar sebaiknya dibangun di atas pemahaman diri yang cukup, bukan sekadar ikut arus.',
    category: 'Pendidikan',
    content: 'Memilih jurusan lebih tepat bila dimulai dari pemahaman minat dan arah diri.',
    featuredImage: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
    isPublished: true,
  },
  {
    slug: 'mengapa-observasi-diri-penting-sebelum-melangkah',
    title: 'Mengapa Observasi Diri Penting Sebelum Melangkah',
    summary: 'Observasi diri membantu seseorang menyusun langkah yang lebih sadar dan tidak mudah terseret ekspektasi luar.',
    excerpt: 'Sebelum mengambil keputusan besar, observasi diri membantu kita memahami apa yang sebenarnya dibutuhkan dan diperjuangkan.',
    category: 'Insight',
    content: 'Observasi diri adalah fondasi penting sebelum mengambil langkah belajar dan karier.',
    featuredImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    isPublished: true,
  },
];

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

const isFilledScalar = (value) => {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return !Number.isNaN(value);
  if (typeof value === 'boolean') return true;
  return value !== null && value !== undefined;
};

const hasMeaningfulContent = (value) => {
  if (Array.isArray(value)) {
    return value.some((item) => hasMeaningfulContent(item));
  }

  if (isPlainObject(value)) {
    return Object.values(value).some((item) => hasMeaningfulContent(item));
  }

  return isFilledScalar(value);
};

const hasMeaningfulHeroSlides = (value) => (
  Array.isArray(value)
  && value.some((item) => {
    if (!isPlainObject(item)) return false;
    return [item.title, item.desc, item.image, item.subtitle].some((entry) => isFilledScalar(entry));
  })
);

const mergePreferExisting = (current, fallback) => {
  if (Array.isArray(fallback)) {
    return Array.isArray(current) && hasMeaningfulContent(current) ? current : fallback;
  }

  if (isPlainObject(fallback)) {
    const source = isPlainObject(current) ? current : {};
    const merged = {};

    for (const key of Object.keys(fallback)) {
      merged[key] = mergePreferExisting(source[key], fallback[key]);
    }

    for (const key of Object.keys(source)) {
      if (!(key in merged)) {
        merged[key] = source[key];
      }
    }

    return merged;
  }

  return isFilledScalar(current) ? current : fallback;
};

async function ensureLogoAsset() {
  const logoSourcePath = logoSourceCandidates.find((candidate) => fs.existsSync(candidate));
  if (!logoSourcePath) return null;

  fs.mkdirSync(logoTargetDirectory, { recursive: true });
  fs.copyFileSync(logoSourcePath, logoTargetPath);

  const existingMedia = await prisma.mediaAsset.findFirst({ where: { url: logoUrl } });
  if (existingMedia) return existingMedia;

  return prisma.mediaAsset.create({
    data: {
      category: 'branding',
      name: 'NEWME CLASS Logo',
      url: logoUrl,
    },
  });
}

async function upsertSetting(key, fallbackValue) {
  const existing = await prisma.setting.findUnique({ where: { key } });
  const nextValue = mergePreferExisting(existing?.value, fallbackValue);

  if (key === LANDING_KEYS.home) {
    nextValue.hero = hasMeaningfulHeroSlides(nextValue.hero) ? nextValue.hero : fallbackValue.hero;
    nextValue.services = fallbackValue.services;
  }

  if (key === LANDING_KEYS.services) {
    nextValue.servicePages = fallbackValue.servicePages;
  }

  if (key === LANDING_KEYS.navigation) {
    nextValue.serviceLinks = fallbackValue.serviceLinks;
    nextValue.footerServiceLinks = fallbackValue.footerServiceLinks;
  }

  await prisma.setting.upsert({
    where: { key },
    create: { key, value: nextValue },
    update: { value: nextValue },
  });

  return nextValue;
}

async function ensureArticles() {
  const results = [];

  for (const article of defaultArticles) {
    const row = await prisma.article.upsert({
      where: { slug: article.slug },
      create: {
        ...article,
        imageUrl: article.featuredImage,
        tags: ['landing', 'newme'],
        status: 'PUBLISHED',
      },
      update: {
        title: article.title,
        summary: article.summary,
        excerpt: article.excerpt,
        category: article.category,
        content: article.content,
        featuredImage: article.featuredImage,
        imageUrl: article.featuredImage,
        isPublished: true,
        status: 'PUBLISHED',
      },
    });

    results.push({ id: row.id, slug: row.slug, title: row.title });
  }

  return results;
}

async function buildReport() {
  const [global, home, companyProfile, services, shop, privacyPolicy, navigation, articleCount] = await Promise.all([
    prisma.setting.findUnique({ where: { key: LANDING_KEYS.global } }),
    prisma.setting.findUnique({ where: { key: LANDING_KEYS.home } }),
    prisma.setting.findUnique({ where: { key: LANDING_KEYS.companyProfile } }),
    prisma.setting.findUnique({ where: { key: LANDING_KEYS.services } }),
    prisma.setting.findUnique({ where: { key: LANDING_KEYS.shop } }),
    prisma.setting.findUnique({ where: { key: LANDING_KEYS.privacyPolicy } }),
    prisma.setting.findUnique({ where: { key: LANDING_KEYS.navigation } }),
    prisma.article.count({ where: { isPublished: true } }),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    global: {
      siteName: global?.value?.siteName || '',
      tagline: global?.value?.tagline || '',
      phone: global?.value?.phone || '',
      email: global?.value?.email || '',
      logoUrl: global?.value?.logoUrl || '',
    },
    counts: {
      heroSlides: Array.isArray(home?.value?.hero) ? home.value.hero.length : 0,
      homeServices: Array.isArray(home?.value?.services) ? home.value.services.length : 0,
      testimonials: Array.isArray(home?.value?.testimonials) ? home.value.testimonials.length : 0,
      benefits: Array.isArray(home?.value?.benefits) ? home.value.benefits.length : 0,
      activities: Array.isArray(home?.value?.activities) ? home.value.activities.length : 0,
      banners: Array.isArray(home?.value?.banners) ? home.value.banners.length : 0,
      teamMembers: Array.isArray(companyProfile?.value?.teamMembers) ? companyProfile.value.teamMembers.length : 0,
      servicePages: Array.isArray(services?.value?.servicePages) ? services.value.servicePages.length : 0,
      shopProducts: Array.isArray(shop?.value?.products) ? shop.value.products.length : 0,
      privacySections: Array.isArray(privacyPolicy?.value?.sections) ? privacyPolicy.value.sections.length : 0,
      navigationMain: Array.isArray(navigation?.value?.mainLinks) ? navigation.value.mainLinks.length : 0,
      publishedArticles: articleCount,
    },
  };
}

async function main() {
  await ensureLogoAsset();

  const written = {};
  for (const [domainKey, settingKey] of Object.entries(LANDING_KEYS)) {
    written[domainKey] = await upsertSetting(settingKey, defaultContent[domainKey]);
  }

  const articles = await ensureArticles();
  const report = await buildReport();

  const reportsDir = path.join(backendRoot, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, 'landing-reference-sync-report.json');
  fs.writeFileSync(reportPath, `${JSON.stringify({ ...report, articles }, null, 2)}\n`);

  console.log(JSON.stringify({
    success: true,
    logoUrl: written.global?.logoUrl || '',
    navigationMainLinks: written.navigation?.mainLinks?.length || 0,
    heroSlides: written.home?.hero?.length || 0,
    servicePages: written.services?.servicePages?.length || 0,
    shopProducts: written.shop?.products?.length || 0,
    publishedArticles: articles.length,
    reportPath,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
