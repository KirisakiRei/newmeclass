import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  createEmptyLandingAggregate,
  LANDING_CMS_DOMAIN_KEYS,
  LANDING_DOMAIN_SETTING_KEYS,
  LANDING_DOMAIN_SHAPES,
  LEGACY_LANDING_CMS_SETTING_KEY,
  type LandingDomainKey,
} from './landing-cms.defaults';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const isPlainObject = (value: unknown): value is Record<string, any> => (
  !!value && typeof value === 'object' && !Array.isArray(value)
);

const deepMerge = <T>(base: T, override: unknown): T => {
  if (Array.isArray(base)) {
    return (Array.isArray(override) ? clone(override) : clone(base)) as T;
  }

  if (!isPlainObject(base)) {
    return ((override ?? base) as T);
  }

  const next: Record<string, any> = {};
  const overrideObject = isPlainObject(override) ? override : {};

  Object.keys(base).forEach((key) => {
    next[key] = deepMerge((base as Record<string, any>)[key], overrideObject[key]);
  });

  Object.keys(overrideObject).forEach((key) => {
    if (!(key in next)) {
      next[key] = clone(overrideObject[key]);
    }
  });

  return next as T;
};

const normalizeObject = <T extends Record<string, any>>(shape: T, value: unknown): T => (
  deepMerge(clone(shape), isPlainObject(value) ? value : {})
);

@Injectable()
export class LandingCmsService {
  private migratePromise: Promise<void> | null = null;
  private readonly logger = new Logger(LandingCmsService.name);
  private readonly locationCacheTtlMs = 1000 * 60 * 60 * 24;
  private readonly locationRequestTimeoutMs = 10000;
  private readonly locationCache = new Map<string, { data: Array<{ id: string; name: string }>; fetchedAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  private getLocationCacheKey(kind: 'provinces' | 'cities' | 'districts' | 'villages', parentId?: string) {
    return `${kind}:${String(parentId || '').trim()}`;
  }

  private readLocationCache(kind: 'provinces' | 'cities' | 'districts' | 'villages', parentId?: string, allowStale = false) {
    const cacheEntry = this.locationCache.get(this.getLocationCacheKey(kind, parentId));
    if (!cacheEntry) return null;
    const isFresh = (Date.now() - cacheEntry.fetchedAt) < this.locationCacheTtlMs;
    if (!allowStale && !isFresh) {
      return null;
    }
    return cacheEntry.data;
  }

  private writeLocationCache(kind: 'provinces' | 'cities' | 'districts' | 'villages', parentId: string | undefined, data: Array<{ id: string; name: string }>) {
    this.locationCache.set(this.getLocationCacheKey(kind, parentId), {
      data,
      fetchedAt: Date.now(),
    });
  }

  private async readSettingValue(key: string) {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return row?.value;
  }

  private async writeSettingValue(key: string, value: Record<string, any>) {
    await this.prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
    return value;
  }

  private async syncGlobalDomainToLegacySettings(globalValue: Record<string, any>) {
    const currentGeneral = await this.readSettingValue('general');
    const general: Record<string, any> = isPlainObject(currentGeneral)
      ? clone(currentGeneral as Record<string, any>)
      : {};
    const nextSiteName = String(globalValue.siteName || '').trim();
    const nextTagline = String(globalValue.tagline || '').trim();
    const nextMetaTitle = String(globalValue.metaTitle || '').trim();
    const nextMetaDescription = String(globalValue.metaDescription || '').trim();
    const nextMetaKeywords = String(globalValue.metaKeywords || '').trim();
    const nextLogoUrl = String(globalValue.logoUrl || '').trim();
    const nextFaviconUrl = String(globalValue.faviconUrl || '').trim();

    general.siteName = nextSiteName;
    general.companyName = nextSiteName;
    general.siteTitle = nextMetaTitle || nextSiteName;
    general.siteDescription = nextTagline;
    general.tagline = nextTagline;
    general.phone = String(globalValue.phone || '').trim();
    general.email = String(globalValue.email || '').trim();
    general.whatsapp = String(globalValue.whatsapp || '').trim();
    general.address = String(globalValue.address || '').trim();
    general.logoUrl = nextLogoUrl;
    general.logo = nextLogoUrl;
    general.faviconUrl = nextFaviconUrl;
    general.metaTitle = nextMetaTitle;
    general.metaDescription = nextMetaDescription;
    general.metaKeywords = nextMetaKeywords;
    general.seoMetaDescription = nextMetaDescription;
    general.seoKeywords = nextMetaKeywords;
    general.socialLinks = Array.isArray(globalValue.socialLinks) ? clone(globalValue.socialLinks) : [];
    general.maintenanceMode = Boolean(globalValue.maintenanceMode);

    const legacyEntries: Array<[string, any]> = [
      ['general', general],
      ['siteName', nextSiteName],
      ['companyName', nextSiteName],
      ['siteTitle', nextMetaTitle || nextSiteName],
      ['siteDescription', nextTagline],
      ['tagline', nextTagline],
      ['phone', general.phone],
      ['email', general.email],
      ['whatsapp', general.whatsapp],
      ['address', general.address],
      ['logoUrl', nextLogoUrl],
      ['logo', nextLogoUrl],
      ['faviconUrl', nextFaviconUrl],
      ['metaTitle', nextMetaTitle],
      ['metaDescription', nextMetaDescription],
      ['metaKeywords', nextMetaKeywords],
      ['seoMetaDescription', nextMetaDescription],
      ['seoKeywords', nextMetaKeywords],
      ['maintenanceMode', general.maintenanceMode],
    ];

    await this.prisma.$transaction(
      legacyEntries.map(([key, value]) => this.prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })),
    );
  }

  private async readLegacyState() {
    const value = await this.readSettingValue(LEGACY_LANDING_CMS_SETTING_KEY);
    return isPlainObject(value) ? value : {};
  }

  private async ensureDomainState() {
    if (this.migratePromise) {
      await this.migratePromise;
      return;
    }

    this.migratePromise = this.seedMissingDomains();
    try {
      await this.migratePromise;
    } finally {
      this.migratePromise = null;
    }
  }

  private async seedMissingDomains() {
    const settingKeys = [
      ...Object.values(LANDING_DOMAIN_SETTING_KEYS),
      LEGACY_LANDING_CMS_SETTING_KEY,
      'general',
      'boardOfDirectors',
      'teamSupport',
    ];

    const [settingRows, productRows] = await Promise.all([
      this.prisma.setting.findMany({
        where: { key: { in: settingKeys } },
      }),
      this.prisma.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const settingMap = new Map(settingRows.map((row) => [row.key, row.value]));
    const legacy = isPlainObject(settingMap.get(LEGACY_LANDING_CMS_SETTING_KEY))
      ? (settingMap.get(LEGACY_LANDING_CMS_SETTING_KEY) as Record<string, any>)
      : {};
    const general = isPlainObject(settingMap.get('general'))
      ? (settingMap.get('general') as Record<string, any>)
      : {};
    const boardMembers = Array.isArray(settingMap.get('boardOfDirectors'))
      ? (settingMap.get('boardOfDirectors') as Array<Record<string, any>>)
      : [];
    const supportMembers = Array.isArray(settingMap.get('teamSupport'))
      ? (settingMap.get('teamSupport') as Array<Record<string, any>>)
      : [];

    const upserts = LANDING_CMS_DOMAIN_KEYS
      .filter((domainKey) => !settingMap.has(LANDING_DOMAIN_SETTING_KEYS[domainKey]))
      .map((domainKey) => {
        const key = LANDING_DOMAIN_SETTING_KEYS[domainKey];
        const value = this.buildDomainSeed(
          domainKey,
          legacy,
          general,
          boardMembers,
          supportMembers,
          productRows,
        );
        return this.prisma.setting.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
      });

    if (upserts.length) {
      await this.prisma.$transaction(upserts);
    }
  }

  private buildDomainSeed(
    domainKey: LandingDomainKey,
    legacy: Record<string, any>,
    general: Record<string, any>,
    boardMembers: Array<Record<string, any>>,
    supportMembers: Array<Record<string, any>>,
    productRows: Array<Record<string, any>>,
  ) {
    switch (domainKey) {
      case 'global':
        return normalizeObject(LANDING_DOMAIN_SHAPES.global, {
          ...legacy.global,
          siteName: legacy.global?.siteName || general.siteName || general.companyName || LANDING_DOMAIN_SHAPES.global.siteName,
          tagline: legacy.global?.tagline || general.tagline || LANDING_DOMAIN_SHAPES.global.tagline,
          phone: legacy.global?.phone || general.phone || general.whatsapp || '',
          whatsapp: legacy.global?.whatsapp || general.whatsapp || general.phone || '',
          email: legacy.global?.email || general.email || '',
          address: legacy.global?.address || general.address || '',
          logoUrl: legacy.global?.logoUrl || general.logoUrl || general.logo || '',
          faviconUrl: legacy.global?.faviconUrl || general.faviconUrl || '',
          metaTitle: legacy.global?.metaTitle || general.metaTitle || general.siteTitle || '',
          metaDescription: legacy.global?.metaDescription || general.metaDescription || general.seoMetaDescription || '',
          metaKeywords: legacy.global?.metaKeywords || general.metaKeywords || general.seoKeywords || '',
          socialLinks: legacy.global?.socialLinks || general.socialLinks || [],
          maintenanceMode: Boolean(legacy.global?.maintenanceMode ?? general.maintenanceMode ?? false),
        });

      case 'home':
        return normalizeObject(LANDING_DOMAIN_SHAPES.home, {
          hero: legacy.hero,
          about: legacy.about,
          services: legacy.services,
          promo: legacy.promo,
          testimonials: legacy.testimonials,
          benefits: legacy.benefits,
          activities: legacy.activities,
          visiMisi: legacy.visiMisi || legacy.visimisi,
          banners: legacy.banners,
          finalCta: legacy.finalCta,
          ecosystemItems: legacy.ecosystemItems,
        });

      case 'companyProfile': {
        const legacyCompany = isPlainObject(legacy.companyProfile) ? legacy.companyProfile : {};
        const teamMembers = Array.isArray(legacyCompany.teamMembers) && legacyCompany.teamMembers.length
          ? legacyCompany.teamMembers
          : [
              ...boardMembers.map((item, index) => ({
                id: String(item.id || `board-${index + 1}`),
                name: String(item.name || item.fullName || '').trim(),
                role: String(item.role || '').trim(),
                image: String(item.image || item.imageUrl || '').trim(),
                bio: String(item.bio || item.description || '').trim(),
              })),
              ...supportMembers.map((item, index) => ({
                id: String(item.id || `support-${index + 1}`),
                name: String(item.name || item.fullName || '').trim(),
                role: String(item.role || '').trim(),
                image: String(item.image || item.imageUrl || '').trim(),
                bio: String(item.bio || item.description || '').trim(),
              })),
            ].filter((item) => item.name);

        return normalizeObject(LANDING_DOMAIN_SHAPES.companyProfile, {
          ...legacyCompany,
          name: legacyCompany.name || general.siteName || general.companyName || LANDING_DOMAIN_SHAPES.companyProfile.name,
          legalName: legacyCompany.legalName || general.companyName || '',
          description: legacyCompany.description || general.about || '',
          teamMembers,
        });
      }

      case 'services':
        return normalizeObject(LANDING_DOMAIN_SHAPES.services, {
          servicePages: legacy.servicePages,
        });

      case 'shop': {
        const fallbackProducts = productRows.map((item, index) => ({
          id: String(item.id || `product-${index + 1}`),
          name: String(item.name || '').trim(),
          price: Number(item.price || 0),
          category: String(item.category || 'Produk').trim(),
          image: String(item.imageUrl || '').trim(),
          badge: '',
          desc: String(item.description || '').trim(),
          rating: 5,
          reviews: 0,
          stock: 0,
          enabled: Boolean(item.isActive ?? true),
        }));

        const sourceProducts = Array.isArray(legacy.products) && legacy.products.length
          ? legacy.products
          : fallbackProducts;

        const categories = Array.isArray(legacy.shopCategories) && legacy.shopCategories.length
          ? legacy.shopCategories
          : Array.from(new Set(sourceProducts.map((item) => String(item.category || '').trim()).filter(Boolean))).map((name, index) => ({
              id: `category-${index + 1}`,
              name,
              slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
            }));

        return normalizeObject(LANDING_DOMAIN_SHAPES.shop, {
          products: sourceProducts,
          shopCategories: categories,
          discountCodes: legacy.discountCodes,
        });
      }

      case 'privacyPolicy':
        return normalizeObject(LANDING_DOMAIN_SHAPES.privacyPolicy, legacy.privacyPolicy);

      case 'navigation':
        return normalizeObject(LANDING_DOMAIN_SHAPES.navigation, legacy.navigation);

      default:
        return clone(LANDING_DOMAIN_SHAPES.global);
    }
  }

  private async readDomain<T extends LandingDomainKey>(domainKey: T) {
    await this.ensureDomainState();
    const value = await this.readSettingValue(LANDING_DOMAIN_SETTING_KEYS[domainKey]);
    return normalizeObject(LANDING_DOMAIN_SHAPES[domainKey], value);
  }

  private async writeDomain<T extends LandingDomainKey>(domainKey: T, value: unknown) {
    const current = await this.readDomain(domainKey);
    const merged = deepMerge(current, isPlainObject(value) ? value : {});
    const normalized = normalizeObject(LANDING_DOMAIN_SHAPES[domainKey], merged);
    await this.writeSettingValue(LANDING_DOMAIN_SETTING_KEYS[domainKey], normalized);
    if (domainKey === 'global') {
      await this.syncGlobalDomainToLegacySettings(normalized);
    }
    return normalized;
  }

  private mapArticle(row: any) {
    return {
      id: row.id,
      title: row.title || '',
      excerpt: row.excerpt || row.summary || '',
      content: row.content || '',
      image: row.featuredImage || row.imageUrl || '',
      author: row.author || 'Admin NEWME',
      date: row.updatedAt || row.createdAt,
      category: row.category || 'Artikel',
      readTime: row.readTime || '5 menit',
      published: Boolean(row.isPublished ?? true),
    };
  }

  private mapMedia(row: any) {
    return {
      id: row.id,
      url: row.url || '',
      name: row.name || 'Asset',
      category: row.category || 'general',
      addedAt: row.createdAt,
    };
  }

  private async readArticles(includeDrafts = false) {
    const rows = await this.prisma.article.findMany({
      where: includeDrafts ? undefined : { isPublished: true },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => this.mapArticle(row));
  }

  private async readMedia() {
    const rows = await this.prisma.mediaAsset.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.mapMedia(row));
  }

  private async buildAggregateState(includeDraftArticles = false) {
    const [global, home, companyProfile, services, shop, privacyPolicy, navigation, articles, mediaLibrary] =
      await Promise.all([
        this.readDomain('global'),
        this.readDomain('home'),
        this.readDomain('companyProfile'),
        this.readDomain('services'),
        this.readDomain('shop'),
        this.readDomain('privacyPolicy'),
        this.readDomain('navigation'),
        this.readArticles(includeDraftArticles),
        includeDraftArticles ? this.readMedia() : Promise.resolve([]),
      ]);

    const aggregate = createEmptyLandingAggregate();
    return {
      ...aggregate,
      global,
      hero: home.hero,
      about: home.about,
      services: home.services,
      promo: home.promo,
      products: shop.products,
      testimonials: home.testimonials,
      benefits: home.benefits,
      activities: home.activities,
      articles,
      visiMisi: home.visiMisi,
      banners: home.banners,
      finalCta: home.finalCta,
      companyProfile,
      servicePages: services.servicePages,
      ecosystemItems: home.ecosystemItems,
      shopCategories: shop.shopCategories,
      discountCodes: shop.discountCodes,
      privacyPolicy,
      mediaLibrary,
      navigation,
    };
  }

  async getPublicBootstrap() {
    const [global, navigation] = await Promise.all([
      this.readDomain('global'),
      this.readDomain('navigation'),
    ]);
    return { global, navigation };
  }

  async getPublicHome() {
    const [global, navigation, home, articles] = await Promise.all([
      this.readDomain('global'),
      this.readDomain('navigation'),
      this.readDomain('home'),
      this.readArticles(false),
    ]);
    return {
      global,
      navigation,
      ...home,
      articles: articles.slice(0, 6),
    };
  }

  async getPublicCompanyProfile() {
    const [global, navigation, companyProfile, home] = await Promise.all([
      this.readDomain('global'),
      this.readDomain('navigation'),
      this.readDomain('companyProfile'),
      this.readDomain('home'),
    ]);
    return {
      global,
      navigation,
      companyProfile,
      testimonials: home.testimonials,
      benefits: home.benefits,
    };
  }

  async getPublicServices() {
    const [global, navigation, home, services] = await Promise.all([
      this.readDomain('global'),
      this.readDomain('navigation'),
      this.readDomain('home'),
      this.readDomain('services'),
    ]);
    return {
      global,
      navigation,
      services: home.services,
      servicePages: services.servicePages,
    };
  }

  async getPublicServiceBySlug(slug: string) {
    const services = await this.getPublicServices();
    const service = services.servicePages.find((item) => item.slug === slug && item.enabled);
    if (!service) {
      throw new NotFoundException('Halaman layanan tidak ditemukan');
    }
    return {
      global: services.global,
      navigation: services.navigation,
      service,
      servicePages: services.servicePages,
      services: services.services,
    };
  }

  async getPublicShop() {
    const [global, navigation, shop] = await Promise.all([
      this.readDomain('global'),
      this.readDomain('navigation'),
      this.readDomain('shop'),
    ]);
    return { global, navigation, ...shop };
  }

  async getPublicPrivacyPolicy() {
    const [global, navigation, privacyPolicy] = await Promise.all([
      this.readDomain('global'),
      this.readDomain('navigation'),
      this.readDomain('privacyPolicy'),
    ]);
    return { global, navigation, privacyPolicy };
  }

  async getPublicContact() {
    const [global, navigation] = await Promise.all([
      this.readDomain('global'),
      this.readDomain('navigation'),
    ]);
    return {
      global,
      navigation,
      contact: {
        phone: global.phone,
        email: global.email,
        whatsapp: global.whatsapp || global.phone,
        address: global.address,
      },
    };
  }

  async getPublicNavigation() {
    return this.readDomain('navigation');
  }

  async getPublicState() {
    return this.buildAggregateState(false);
  }

  async getCmsState() {
    return this.buildAggregateState(true);
  }

  async getCmsSummary() {
    const state = await this.getCmsState();
    return {
      heroSlides: state.hero.length,
      products: state.products.length,
      testimonials: state.testimonials.length,
      articles: state.articles.length,
      services: state.servicePages.filter((item) => item.enabled).length,
      teamMembers: state.companyProfile.teamMembers.length,
      mediaAssets: state.mediaLibrary.length,
      maintenanceMode: Boolean(state.global.maintenanceMode),
    };
  }

  async getCmsDomain(domainKey: LandingDomainKey) {
    return this.readDomain(domainKey);
  }

  async updateDomain(domainKey: LandingDomainKey, value: unknown) {
    return this.writeDomain(domainKey, value);
  }

  async getLocationCollection(kind: 'provinces' | 'cities' | 'districts' | 'villages', parentId?: string) {
    const normalizedParentId = String(parentId || '').trim();
    if (kind !== 'provinces' && !normalizedParentId) {
      throw new BadRequestException('Parameter parent id wajib diisi');
    }

    const freshCache = this.readLocationCache(kind, normalizedParentId);
    if (freshCache) {
      return freshCache;
    }

    const urlMap = {
      provinces: 'https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json',
      cities: `https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${normalizedParentId}.json`,
      districts: `https://www.emsifa.com/api-wilayah-indonesia/api/districts/${normalizedParentId}.json`,
      villages: `https://www.emsifa.com/api-wilayah-indonesia/api/villages/${normalizedParentId}.json`,
    } as const;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.locationRequestTimeoutMs);
      let response: Response;
      try {
        response = await fetch(urlMap[kind], {
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!response.ok) {
        throw new Error(`Upstream lokasi ${kind} merespons ${response.status}`);
      }

      const data = await response.json();
      const rows = Array.isArray(data) ? data : [];
      this.writeLocationCache(kind, normalizedParentId, rows);
      return rows;
    } catch (error) {
      const staleCache = this.readLocationCache(kind, normalizedParentId, true);
      if (staleCache) {
        this.logger.warn(`Menggunakan cache stale untuk lokasi ${kind} (${normalizedParentId || 'root'}) karena upstream gagal.`);
        return staleCache;
      }

      this.logger.error(`Gagal mengambil data lokasi ${kind} (${normalizedParentId || 'root'}): ${error instanceof Error ? error.message : String(error)}`);
      throw new ServiceUnavailableException(`Data lokasi ${kind} sedang tidak tersedia`);
    }
  }
}
