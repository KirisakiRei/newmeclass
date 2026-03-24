import { request } from './client';

export const landingAPI = {
  getPublicBootstrap: () => request('/landing/public/bootstrap'),
  getPublicHome: () => request('/landing/public/home'),
  getPublicCompanyProfile: () => request('/landing/public/company-profile'),
  getPublicServices: () => request('/landing/public/services'),
  getPublicServiceBySlug: (slug: string) => request(`/landing/public/services/${encodeURIComponent(slug)}`),
  getPublicShop: () => request('/landing/public/shop'),
  getPublicPrivacyPolicy: () => request('/landing/public/privacy-policy'),
  getPublicContact: () => request('/landing/public/contact'),
  getPublicNavigation: () => request('/landing/public/navigation'),
  getPublicState: () => request('/landing/public/state'),

  getCmsSummary: () => request('/landing/cms/summary', { tokenKey: 'admin_token' }),
  getCmsState: () => request('/landing/cms/state', { tokenKey: 'admin_token' }),
  getCmsGlobal: () => request('/landing/cms/global', { tokenKey: 'admin_token' }),
  updateCmsGlobal: (value: unknown) =>
    request('/landing/cms/global', { method: 'PUT', body: value, tokenKey: 'admin_token' }),
  getCmsHome: () => request('/landing/cms/home', { tokenKey: 'admin_token' }),
  updateCmsHome: (value: unknown) =>
    request('/landing/cms/home', { method: 'PUT', body: value, tokenKey: 'admin_token' }),
  getCmsCompanyProfile: () => request('/landing/cms/companyProfile', { tokenKey: 'admin_token' }),
  updateCmsCompanyProfile: (value: unknown) =>
    request('/landing/cms/companyProfile', { method: 'PUT', body: value, tokenKey: 'admin_token' }),
  getCmsServices: () => request('/landing/cms/services', { tokenKey: 'admin_token' }),
  updateCmsServices: (value: unknown) =>
    request('/landing/cms/services', { method: 'PUT', body: value, tokenKey: 'admin_token' }),
  getCmsShop: () => request('/landing/cms/shop', { tokenKey: 'admin_token' }),
  updateCmsShop: (value: unknown) =>
    request('/landing/cms/shop', { method: 'PUT', body: value, tokenKey: 'admin_token' }),
  getCmsPrivacyPolicy: () => request('/landing/cms/privacyPolicy', { tokenKey: 'admin_token' }),
  updateCmsPrivacyPolicy: (value: unknown) =>
    request('/landing/cms/privacyPolicy', { method: 'PUT', body: value, tokenKey: 'admin_token' }),
  getCmsNavigation: () => request('/landing/cms/navigation', { tokenKey: 'admin_token' }),
  updateCmsNavigation: (value: unknown) =>
    request('/landing/cms/navigation', { method: 'PUT', body: value, tokenKey: 'admin_token' }),

  getProvinces: () => request('/landing/public/locations/provinces'),
  getCities: (provinceId: string) =>
    request(`/landing/public/locations/cities?provinceId=${encodeURIComponent(provinceId)}`),
  getDistricts: (cityId: string) =>
    request(`/landing/public/locations/districts?cityId=${encodeURIComponent(cityId)}`),
  getVillages: (districtId: string) =>
    request(`/landing/public/locations/villages?districtId=${encodeURIComponent(districtId)}`),
};
