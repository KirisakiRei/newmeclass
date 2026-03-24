export const LEGACY_LANDING_CMS_SETTING_KEY = 'landingCmsState';

export const LANDING_DOMAIN_SETTING_KEYS = {
  global: 'landingGlobal',
  home: 'landingHome',
  companyProfile: 'landingCompanyProfile',
  services: 'landingServicePages',
  shop: 'landingShop',
  privacyPolicy: 'landingPrivacyPolicy',
  navigation: 'landingNavigation',
} as const;

export type LandingDomainKey = keyof typeof LANDING_DOMAIN_SETTING_KEYS;

export const LANDING_CMS_DOMAIN_KEYS = Object.keys(
  LANDING_DOMAIN_SETTING_KEYS,
) as LandingDomainKey[];

export const createEmptyLandingGlobal = () => ({
  siteName: 'NEWME CLASS',
  tagline: 'Jati dirimu disini',
  phone: '',
  email: '',
  whatsapp: '',
  address: '',
  logoUrl: '',
  faviconUrl: '',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  socialLinks: [] as Array<{ platform: string; url: string }>,
  maintenanceMode: false,
});

export const createEmptyLandingHome = () => ({
  hero: [] as Array<{
    id: string;
    subtitle: string;
    title: string;
    desc: string;
    image: string;
    ctaText: string;
    ctaLink: string;
  }>,
  about: {
    badge: '',
    title: '',
    description: '',
    stats: [] as Array<{ label: string; value: string }>,
    image: '',
  },
  services: [] as Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    link: string;
    enabled: boolean;
    type?: 'b2b' | 'b2c';
    subtitle?: string;
    badge?: string;
    badgeTone?: string;
    tags?: string[];
    image?: string;
    iconTone?: string;
  }>,
  promo: {
    badge: '',
    title: '',
    subtitle: '',
    description: '',
    tests: [] as string[],
    image: '',
    ctaText: '',
    ctaLink: '',
    enabled: true,
  },
  testimonials: [] as Array<{
    id: string;
    name: string;
    role: string;
    text: string;
    avatar: string;
    rating: number;
  }>,
  benefits: [] as Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
  }>,
  activities: [] as Array<{
    id: string;
    title: string;
    date: string;
    image: string;
    description: string;
  }>,
  visiMisi: {
    visi: '',
    misi: [] as string[],
    values: [] as Array<{ title: string; desc: string }>,
  },
  banners: [] as Array<{
    id: string;
    title: string;
    subtitle: string;
    image: string;
    ctaText: string;
    ctaLink: string;
    enabled: boolean;
  }>,
  finalCta: {
    title: '',
    subtitle: '',
    ctaText: '',
    ctaLink: '',
  },
  ecosystemItems: [] as Array<{
    id: string;
    title: string;
    subtitle: string;
    desc: string;
    badge: string;
    icon: string;
    image: string;
    href: string;
    color: string;
    enabled: boolean;
  }>,
});

export const createEmptyLandingCompanyProfile = () => ({
  name: 'NEWME CLASS',
  legalName: '',
  foundedYear: '',
  description: '',
  vision: '',
  mission: [] as string[],
  teamMembers: [] as Array<{
    id: string;
    name: string;
    role: string;
    image: string;
    bio: string;
  }>,
});

export const createEmptyLandingServices = () => ({
  servicePages: [] as Array<{
    id: string;
    slug: string;
    title: string;
    subtitle: string;
    heroImage: string;
    heroBadge?: string;
    heroPrimaryCtaText?: string;
    heroPrimaryCtaLink?: string;
    heroSecondaryCtaText?: string;
    heroSecondaryCtaLink?: string;
    description: string;
    introTitle?: string;
    introParagraphs?: string[];
    features: Array<{ title: string; desc: string }>;
    pricing: Array<{ name: string; price: string; features: string[] }>;
    enabled: boolean;
    phases?: Array<{ title: string; desc: string }>;
    galiBakatBenefits?: Array<{ title: string; desc: string }>;
    optimasiItems?: string[];
    consultTypes?: Array<{
      title: string;
      subtitle: string;
      desc: string;
      duration: string;
      mode: string;
      topics: string[];
      price: string;
      icon?: string;
      theme?: string;
    }>;
    psychologists?: Array<{
      id: string;
      name: string;
      specialty: string;
      rating: number;
      sessions: number;
      initials: string;
    }>;
    clinicFeatures?: Array<{ title: string; desc: string }>;
    courses?: Array<{
      id: string;
      title: string;
      instructor: string;
      duration: string;
      students: number;
      rating: number;
      price: string;
      badge: string;
      image: string;
    }>;
    classHighlights?: Array<{
      icon: string;
      label: string;
      desc: string;
    }>;
    webinars?: Array<{
      id: string;
      title: string;
      date: string;
      time: string;
      speaker: string;
      spots: number;
      price: string;
    }>;
    galleryPhotos?: Array<{
      id: string;
      src: string;
      caption: string;
      category: string;
    }>;
    galleryVideos?: Array<{
      id: string;
      title: string;
      speaker: string;
      duration: string;
      category: string;
    }>;
    netBenefits?: Array<{ icon: string; title: string; desc: string }>;
    memberPlans?: Array<{
      name: string;
      price: string;
      period: string;
      features: string[];
      highlight: boolean;
    }>;
  }>,
});

export const createEmptyLandingShop = () => ({
  products: [] as Array<{
    id: string;
    name: string;
    price: number;
    category: string;
    image: string;
    badge: string;
    desc: string;
    rating: number;
    reviews: number;
    stock: number;
    enabled: boolean;
  }>,
  shopCategories: [] as Array<{
    id: string;
    name: string;
    slug: string;
  }>,
  discountCodes: [] as Array<{
    id: string;
    code: string;
    type: 'percent' | 'fixed';
    value: number;
    minPurchase: number;
    active: boolean;
    expiresAt: string;
  }>,
});

export const createEmptyLandingPrivacyPolicy = () => ({
  lastUpdated: '',
  sections: [] as Array<{
    id: string;
    title: string;
    content: string;
  }>,
});

export const createEmptyLandingNavigation = () => ({
  mainLinks: [
    { label: 'Beranda', href: '/' },
    { label: 'Profile', href: '/company-profile' },
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
    { label: 'Kontak', href: '/contact' },
    { label: 'Artikel', href: '/articles' },
  ],
  footerServiceLinks: [
    { label: 'Kelas Gali Bakat', href: '/services/personality-tests' },
    { label: 'NEWME Clinic', href: '/services/clinic' },
    { label: 'NEWME Class', href: '/services/class' },
    { label: 'NEWME Gallery', href: '/services/gallery' },
  ],
  legalLinks: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Kontak', href: '/contact' },
  ],
  authLinks: {
    login: { label: 'Login', href: '/login' },
    register: { label: 'Daftar', href: '/register' },
  },
});

export const createEmptyLandingAggregate = () => ({
  global: createEmptyLandingGlobal(),
  hero: createEmptyLandingHome().hero,
  about: createEmptyLandingHome().about,
  services: createEmptyLandingHome().services,
  promo: createEmptyLandingHome().promo,
  products: createEmptyLandingShop().products,
  testimonials: createEmptyLandingHome().testimonials,
  benefits: createEmptyLandingHome().benefits,
  activities: createEmptyLandingHome().activities,
  articles: [] as any[],
  visiMisi: createEmptyLandingHome().visiMisi,
  banners: createEmptyLandingHome().banners,
  finalCta: createEmptyLandingHome().finalCta,
  companyProfile: createEmptyLandingCompanyProfile(),
  servicePages: createEmptyLandingServices().servicePages,
  ecosystemItems: createEmptyLandingHome().ecosystemItems,
  shopCategories: createEmptyLandingShop().shopCategories,
  discountCodes: createEmptyLandingShop().discountCodes,
  privacyPolicy: createEmptyLandingPrivacyPolicy(),
  mediaLibrary: [] as any[],
  navigation: createEmptyLandingNavigation(),
});

export const LANDING_DOMAIN_SHAPES = {
  global: createEmptyLandingGlobal(),
  home: createEmptyLandingHome(),
  companyProfile: createEmptyLandingCompanyProfile(),
  services: createEmptyLandingServices(),
  shop: createEmptyLandingShop(),
  privacyPolicy: createEmptyLandingPrivacyPolicy(),
  navigation: createEmptyLandingNavigation(),
} as const;
