import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { articlesAPI, landingAPI, mediaAPI } from "../../../services/api";
import { clearAdminSession, hasAdminSession } from "../../../lib/session";

export interface HeroSlide {
  id: string;
  subtitle: string;
  title: string;
  desc: string;
  image: string;
  ctaText: string;
  ctaLink: string;
}

export interface AboutData {
  badge: string;
  title: string;
  description: string;
  stats: { label: string; value: string }[];
  image: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  link: string;
  enabled: boolean;
  type?: "b2b" | "b2c";
  subtitle?: string;
  badge?: string;
  badgeTone?: string;
  tags?: string[];
  image?: string;
  iconTone?: string;
}

export interface PromoData {
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  tests: string[];
  image: string;
  ctaText: string;
  ctaLink: string;
  enabled: boolean;
}

export interface EcosystemItem {
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
}

export interface ProductItem {
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
}

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  text: string;
  avatar: string;
  rating: number;
}

export interface BenefitItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  caption?: string;
  date: string;
  image: string;
  description: string;
}

export interface ArticleItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  author: string;
  date: string;
  category: string;
  readTime: string;
  published: boolean;
}

export interface VisiMisiData {
  visi: string;
  misi: string[];
  values: { title: string; desc: string }[];
}

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  enabled: boolean;
}

export interface FinalCTAData {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
}

export interface GlobalSettings {
  siteName: string;
  tagline: string;
  phone: string;
  email: string;
  whatsapp?: string;
  address: string;
  logoUrl: string;
  faviconUrl: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  socialLinks: { platform: string; url: string }[];
  maintenanceMode: boolean;
}

export interface CompanyProfile {
  name: string;
  legalName: string;
  foundedYear: string;
  description: string;
  vision: string;
  mission: string[];
  teamMembers: { id: string; name: string; role: string; image: string; bio: string }[];
}

export interface ProgramPhase { title: string; desc: string; }
export interface ConsultType {
  title: string; subtitle: string; desc: string; duration: string; mode: string; topics: string[]; price: string;
}
export interface ClinicPsychologist {
  id: string; name: string; specialty: string; rating: number; sessions: number; initials: string;
}
export interface ClinicFeature { title: string; desc: string; }
export interface CourseItem {
  id: string; title: string; instructor: string; duration: string; students: number; rating: number; price: string; badge: string; image: string;
}
export interface WebinarItem {
  id: string; title: string; date: string; time: string; speaker: string; spots: number; price: string;
}
export interface GalleryPhoto { id: string; src: string; caption: string; category: string; }
export interface GalleryVideo { id: string; title: string; speaker: string; duration: string; category: string; }
export interface NetBenefit { icon: string; title: string; desc: string; }
export interface MemberPlan { name: string; price: string; period: string; features: string[]; highlight: boolean; }

export interface ServicePageData {
  id: string; slug: string; title: string; subtitle: string; heroImage: string;
  heroBadge?: string;
  heroPrimaryCtaText?: string;
  heroPrimaryCtaLink?: string;
  heroSecondaryCtaText?: string;
  heroSecondaryCtaLink?: string;
  description: string;
  introTitle?: string;
  introParagraphs?: string[];
  features: { title: string; desc: string }[];
  pricing: { name: string; price: string; features: string[] }[];
  enabled: boolean;
  phases?: ProgramPhase[];
  galiBakatBenefits?: { title: string; desc: string }[];
  optimasiItems?: string[];
  consultTypes?: Array<ConsultType & { icon?: string; theme?: string }>;
  psychologists?: ClinicPsychologist[];
  clinicFeatures?: ClinicFeature[];
  courses?: CourseItem[];
  classHighlights?: { icon: string; label: string; desc: string }[];
  webinars?: WebinarItem[];
  galleryPhotos?: GalleryPhoto[];
  galleryVideos?: GalleryVideo[];
  netBenefits?: NetBenefit[];
  memberPlans?: MemberPlan[];
}

export interface MediaItem {
  id: string; url: string; name: string; category: string; addedAt: string;
}

export interface ShopCategory {
  id: string;
  name: string;
  slug: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minPurchase: number;
  active: boolean;
  expiresAt: string;
}

export interface PrivacyPolicyData {
  lastUpdated: string;
  sections: { id: string; title: string; content: string }[];
}

export interface NavigationLink {
  label: string;
  href: string;
}

export interface NavigationData {
  mainLinks: NavigationLink[];
  serviceLinks: NavigationLink[];
  footerMenuLinks: NavigationLink[];
  footerServiceLinks: NavigationLink[];
  legalLinks: NavigationLink[];
  authLinks: {
    login: NavigationLink;
    register: NavigationLink;
  };
}

export interface CMSData {
  global: GlobalSettings;
  hero: HeroSlide[];
  about: AboutData;
  services: ServiceItem[];
  promo: PromoData;
  products: ProductItem[];
  testimonials: TestimonialItem[];
  benefits: BenefitItem[];
  activities: ActivityItem[];
  articles: ArticleItem[];
  visiMisi: VisiMisiData;
  banners: BannerItem[];
  finalCta: FinalCTAData;
  companyProfile: CompanyProfile;
  servicePages: ServicePageData[];
  ecosystemItems: EcosystemItem[];
  shopCategories: ShopCategory[];
  discountCodes: DiscountCode[];
  privacyPolicy: PrivacyPolicyData;
  mediaLibrary: MediaItem[];
  navigation: NavigationData;
}

const EMPTY_DATA: CMSData = {
  global: {
    siteName: "NEWME CLASS",
    tagline: "Jati dirimu disini",
    phone: "",
    email: "",
    whatsapp: "",
    address: "",
    logoUrl: "",
    faviconUrl: "",
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    socialLinks: [],
    maintenanceMode: false,
  },
  hero: [],
  about: { badge: "", title: "", description: "", stats: [], image: "" },
  services: [],
  promo: { badge: "", title: "", subtitle: "", description: "", tests: [], image: "", ctaText: "", ctaLink: "", enabled: true },
  products: [],
  testimonials: [],
  benefits: [],
  activities: [],
  articles: [],
  visiMisi: { visi: "", misi: [], values: [] },
  banners: [],
  finalCta: { title: "", subtitle: "", ctaText: "", ctaLink: "" },
  companyProfile: { name: "NEWME CLASS", legalName: "", foundedYear: "", description: "", vision: "", mission: [], teamMembers: [] },
  servicePages: [],
  ecosystemItems: [],
  shopCategories: [],
  discountCodes: [],
  privacyPolicy: { lastUpdated: "", sections: [] },
  mediaLibrary: [],
  navigation: {
    mainLinks: [],
    serviceLinks: [],
    footerMenuLinks: [],
    footerServiceLinks: [],
    legalLinks: [],
    authLinks: {
      login: { label: "Login", href: "/login" },
      register: { label: "Daftar", href: "/register" },
    },
  },
};

type CMSContextType = {
  data: CMSData;
  updateData: <K extends keyof CMSData>(key: K, value: CMSData[K]) => void;
  updateNestedData: <K extends keyof CMSData>(key: K, path: string, value: any) => void;
  resetData: () => Promise<void>;
  lastSaved: string | null;
  loading: boolean;
  saveError: string | null;
};

type LoadResult = {
  data: CMSData;
  complete: boolean;
  errors: string[];
  authFailure?: boolean;
};

type DomainKey = "global" | "home" | "companyProfile" | "services" | "shop" | "privacyPolicy" | "navigation" | "articles";

const DOMAIN_BY_DATA_KEY: Partial<Record<keyof CMSData, DomainKey>> = {
  global: "global",
  hero: "home",
  about: "home",
  services: "home",
  promo: "home",
  testimonials: "home",
  benefits: "home",
  activities: "home",
  visiMisi: "home",
  banners: "home",
  finalCta: "home",
  ecosystemItems: "home",
  companyProfile: "companyProfile",
  servicePages: "services",
  products: "shop",
  shopCategories: "shop",
  discountCodes: "shop",
  privacyPolicy: "privacyPolicy",
  articles: "articles",
  navigation: "navigation",
};

const CMSContext = createContext<CMSContextType | null>(null);

const mapArticle = (row: any): ArticleItem => ({
  id: String(row?.id || row?._id || ""),
  title: String(row?.title || ""),
  excerpt: String(row?.excerpt || row?.summary || ""),
  content: String(row?.content || row?.excerpt || row?.summary || ""),
  image: String(row?.image || row?.imageUrl || row?.featuredImage || ""),
  author: String(row?.author || "Admin NEWME"),
  date: String(row?.date || row?.updatedAt || row?.createdAt || ""),
  category: String(row?.category || "Artikel"),
  readTime: String(row?.readTime || "5 menit"),
  published: Boolean(row?.published ?? row?.isPublished ?? true),
});

const mapMedia = (row: any): MediaItem => ({
  id: String(row?.id || row?._id || ""),
  url: String(row?.url || ""),
  name: String(row?.name || "Asset"),
  category: String(row?.category || "general"),
  addedAt: String(row?.addedAt || row?.createdAt || ""),
});

const composeData = ({
  global,
  home,
  companyProfile,
  services,
  shop,
  privacyPolicy,
  navigation,
  articles,
  mediaLibrary,
}: {
  global?: Partial<GlobalSettings>;
  home?: any;
  companyProfile?: Partial<CompanyProfile>;
  services?: any;
  shop?: any;
  privacyPolicy?: Partial<PrivacyPolicyData>;
  navigation?: Partial<NavigationData>;
  articles?: ArticleItem[];
  mediaLibrary?: MediaItem[];
}): CMSData => ({
  ...EMPTY_DATA,
  global: { ...EMPTY_DATA.global, ...(global || {}) },
  hero: Array.isArray(home?.hero) ? home.hero : [],
  about: { ...EMPTY_DATA.about, ...(home?.about || {}) },
  services: Array.isArray(home?.services) ? home.services : [],
  promo: { ...EMPTY_DATA.promo, ...(home?.promo || {}) },
  products: Array.isArray(shop?.products) ? shop.products : [],
  testimonials: Array.isArray(home?.testimonials) ? home.testimonials : [],
  benefits: Array.isArray(home?.benefits) ? home.benefits : [],
  activities: Array.isArray(home?.activities) ? home.activities : [],
  articles: articles || [],
  visiMisi: { ...EMPTY_DATA.visiMisi, ...(home?.visiMisi || {}) },
  banners: Array.isArray(home?.banners) ? home.banners : [],
  finalCta: { ...EMPTY_DATA.finalCta, ...(home?.finalCta || {}) },
  companyProfile: { ...EMPTY_DATA.companyProfile, ...(companyProfile || {}) },
  servicePages: Array.isArray(services?.servicePages) ? services.servicePages : [],
  ecosystemItems: Array.isArray(home?.ecosystemItems) ? home.ecosystemItems : [],
  shopCategories: Array.isArray(shop?.shopCategories) ? shop.shopCategories : [],
  discountCodes: Array.isArray(shop?.discountCodes) ? shop.discountCodes : [],
  privacyPolicy: { ...EMPTY_DATA.privacyPolicy, ...(privacyPolicy || {}) },
  mediaLibrary: mediaLibrary || [],
  navigation: {
    mainLinks: navigation?.mainLinks || [],
    serviceLinks: navigation?.serviceLinks || [],
    footerMenuLinks: navigation?.footerMenuLinks || [],
    footerServiceLinks: navigation?.footerServiceLinks || [],
    legalLinks: navigation?.legalLinks || [],
    authLinks: {
      login: navigation?.authLinks?.login || EMPTY_DATA.navigation.authLinks.login,
      register: navigation?.authLinks?.register || EMPTY_DATA.navigation.authLinks.register,
    },
  },
});

const buildDomainPayload = (domainKey: DomainKey, data: CMSData) => {
  switch (domainKey) {
    case "global":
      return data.global;
    case "home":
      return {
        hero: data.hero,
        about: data.about,
        services: data.services,
        promo: data.promo,
        testimonials: data.testimonials,
        benefits: data.benefits,
        activities: data.activities,
        visiMisi: data.visiMisi,
        banners: data.banners,
        finalCta: data.finalCta,
        ecosystemItems: data.ecosystemItems,
      };
    case "companyProfile":
      return data.companyProfile;
    case "services":
      return { servicePages: data.servicePages };
    case "shop":
      return {
        products: data.products,
        shopCategories: data.shopCategories,
        discountCodes: data.discountCodes,
      };
    case "privacyPolicy":
      return data.privacyPolicy;
    case "navigation":
      return data.navigation;
    case "articles":
      return { items: data.articles };
    default:
      return {};
  }
};

const updateDomainByKey = async (domainKey: DomainKey, payload: unknown) => {
  switch (domainKey) {
    case "global":
      return landingAPI.updateCmsGlobal(payload);
    case "home":
      return landingAPI.updateCmsHome(payload);
    case "companyProfile":
      return landingAPI.updateCmsCompanyProfile(payload);
    case "services":
      return landingAPI.updateCmsServices(payload);
    case "shop":
      return landingAPI.updateCmsShop(payload);
    case "privacyPolicy":
      return landingAPI.updateCmsPrivacyPolicy(payload);
    case "navigation":
      return landingAPI.updateCmsNavigation(payload);
    case "articles":
      return articlesAPI.bulkSync((((payload as { items?: ArticleItem[] })?.items) || []) as unknown as Array<Record<string, unknown>>);
    default:
      return null;
  }
};

const isAuthFailureError = (error: unknown) => {
  const status = Number((error as { status?: number } | null)?.status || 0);
  return status === 401 || status === 403;
};

const redirectToCmsLogin = () => {
  if (typeof window === "undefined") return;
  const next = `${window.location.pathname}${window.location.search}`;
  clearAdminSession();
  const query = new URLSearchParams({
    next,
    reason: "forbidden",
  });
  window.location.replace(`/cms/login?${query.toString()}`);
};

const settleLoad = async <T,>(
  label: string,
  task: Promise<T>,
  fallback: T,
): Promise<{ value: T; error?: string; authFailure?: boolean }> => {
  try {
    const value = await task;
    return { value };
  } catch (error) {
    if (isAuthFailureError(error)) {
      return {
        value: fallback,
        error: `${label}: sesi CMS tidak valid`,
        authFailure: true,
      };
    }
    const message = error instanceof Error ? error.message : `Gagal memuat ${label}`;
    console.error(`Failed to load ${label}:`, error);
    return { value: fallback, error: `${label}: ${message}` };
  }
};

const loadPublicContent = async (): Promise<LoadResult> => {
  const [bootstrap, home, company, services, shop, privacy, articles] = await Promise.all([
    settleLoad("public bootstrap", landingAPI.getPublicBootstrap(), null),
    settleLoad("public home", landingAPI.getPublicHome(), null),
    settleLoad("public company profile", landingAPI.getPublicCompanyProfile(), null),
    settleLoad("public services", landingAPI.getPublicServices(), null),
    settleLoad("public shop", landingAPI.getPublicShop(), null),
    settleLoad("public privacy policy", landingAPI.getPublicPrivacyPolicy(), null),
    settleLoad("public articles", articlesAPI.getAll({ isPublished: true }), [] as any[]),
  ]);

  const errors = [bootstrap, home, company, services, shop, privacy, articles]
    .flatMap((result) => result.error ? [result.error] : []);

  return {
    data: composeData({
      global: bootstrap.value?.global,
      navigation: bootstrap.value?.navigation,
      home: home.value,
      companyProfile: company.value?.companyProfile,
      services: services.value,
      shop: shop.value,
      privacyPolicy: privacy.value?.privacyPolicy,
      articles: Array.isArray(articles.value) ? articles.value.map(mapArticle) : [],
      mediaLibrary: [],
    }),
    complete: errors.length === 0,
    errors,
    authFailure: [bootstrap, home, company, services, shop, privacy, articles].some((result) => result.authFailure),
  };
};

const loadCmsContent = async (): Promise<LoadResult> => {
  const [global, home, companyProfile, services, shop, privacyPolicy, navigation, articles, mediaLibrary] = await Promise.all([
    settleLoad("CMS global", landingAPI.getCmsGlobal(), null),
    settleLoad("CMS home", landingAPI.getCmsHome(), null),
    settleLoad("CMS company profile", landingAPI.getCmsCompanyProfile(), null),
    settleLoad("CMS services", landingAPI.getCmsServices(), null),
    settleLoad("CMS shop", landingAPI.getCmsShop(), null),
    settleLoad("CMS privacy policy", landingAPI.getCmsPrivacyPolicy(), null),
    settleLoad("CMS navigation", landingAPI.getCmsNavigation(), null),
    settleLoad("CMS articles", articlesAPI.getAll(), [] as any[]),
    settleLoad("CMS media library", mediaAPI.getAll(), [] as any[]),
  ]);

  const errors = [global, home, companyProfile, services, shop, privacyPolicy, navigation, articles, mediaLibrary]
    .flatMap((result) => result.error ? [result.error] : []);

  return {
    data: composeData({
      global: global.value,
      home: home.value,
      companyProfile: companyProfile.value,
      services: services.value,
      shop: shop.value,
      privacyPolicy: privacyPolicy.value,
      navigation: navigation.value,
      articles: Array.isArray(articles.value) ? articles.value.map(mapArticle) : [],
      mediaLibrary: Array.isArray(mediaLibrary.value) ? mediaLibrary.value.map(mapMedia) : [],
    }),
    complete: errors.length === 0,
    errors,
    authFailure: [global, home, companyProfile, services, shop, privacyPolicy, navigation, articles, mediaLibrary]
      .some((result) => result.authFailure),
  };
};

export function CMSProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CMSData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [cmsReadyForAutosave, setCmsReadyForAutosave] = useState(false);
  const dirtyDomainsRef = useRef<DomainKey[]>([]);

  const isCmsSession =
    typeof window !== "undefined"
    && window.location.pathname.startsWith("/cms")
    && !window.location.pathname.startsWith("/cms/login");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      if (isCmsSession) {
        setCmsReadyForAutosave(false);
      }
      const next = isCmsSession ? await loadCmsContent() : await loadPublicContent();
      if (isCmsSession && next.authFailure) {
        redirectToCmsLogin();
        return;
      }
      setData(next.data);
      setSaveError(next.errors.length > 0 ? next.errors.join(" | ") : null);
      if (isCmsSession) {
        setCmsReadyForAutosave(next.complete);
      }
    } catch (error) {
      console.error("Failed to load landing content:", error);
      if (isCmsSession) {
        setCmsReadyForAutosave(false);
      }
      setSaveError(error instanceof Error ? error.message : "Gagal memuat konten landing");
    } finally {
      setLoading(false);
    }
  }, [isCmsSession]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isCmsSession) return;
    if (!cmsReadyForAutosave) return;
    if (loading) return;
    if (dirtyDomainsRef.current.length === 0) return;

    const dirtyDomains = [...dirtyDomainsRef.current];
    const timeout = setTimeout(async () => {
      try {
        setSaveError(null);
        await Promise.all(
          dirtyDomains.map((domainKey) => updateDomainByKey(domainKey, buildDomainPayload(domainKey, data))),
        );
        dirtyDomainsRef.current = dirtyDomainsRef.current.filter((domainKey) => !dirtyDomains.includes(domainKey));
        setLastSaved(new Date().toLocaleTimeString("id-ID"));
      } catch (error) {
        if (isAuthFailureError(error)) {
          redirectToCmsLogin();
          return;
        }
        const message = error instanceof Error ? error.message : "Gagal menyimpan perubahan CMS";
        setSaveError(message);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [cmsReadyForAutosave, data, isCmsSession, loading]);

  const markDomainDirty = useCallback((key: keyof CMSData) => {
    const domainKey = DOMAIN_BY_DATA_KEY[key];
    if (!domainKey) return;
    if (!dirtyDomainsRef.current.includes(domainKey)) {
      dirtyDomainsRef.current = [...dirtyDomainsRef.current, domainKey];
    }
  }, []);

  const updateData = useCallback(<K extends keyof CMSData>(key: K, value: CMSData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    markDomainDirty(key);
  }, [markDomainDirty]);

  const updateNestedData = useCallback(<K extends keyof CMSData>(key: K, path: string, value: any) => {
    setData((prev) => {
      const section = { ...(prev[key] as any) };
      const keys = path.split(".");
      let current = section;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = Array.isArray(current[keys[i]]) ? [...current[keys[i]]] : { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return { ...prev, [key]: section };
    });
    markDomainDirty(key);
  }, [markDomainDirty]);

  const resetData = useCallback(async () => {
    dirtyDomainsRef.current = [];
    setLastSaved(null);
    setSaveError(null);
    setCmsReadyForAutosave(false);
    await load();
  }, [load]);

  return (
    <CMSContext.Provider value={{ data, updateData, updateNestedData, resetData, lastSaved, loading, saveError }}>
      {children}
    </CMSContext.Provider>
  );
}

export function useCMS() {
  const ctx = useContext(CMSContext);
  if (!ctx) throw new Error("useCMS must be used within CMSProvider");
  return ctx;
}
