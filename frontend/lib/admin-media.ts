// @ts-nocheck
import axios from 'axios';

const BACKEND_URL = String(process.env.REACT_APP_BACKEND_URL || '').trim().replace(/\/+$/, '');

export const MEDIA_CATEGORIES = [
  { value: '', label: 'Semua' },
  { value: 'hero-slides', label: 'Hero Slides' },
  { value: 'banners', label: 'Banners' },
  { value: 'products-home', label: 'Produk Homepage' },
  { value: 'products-shop', label: 'Produk Shop' },
  { value: 'testimonials', label: 'Testimonial' },
  { value: 'activities', label: 'Kegiatan' },
  { value: 'articles', label: 'Artikel' },
  { value: 'team', label: 'Tim & Mitra' },
  { value: 'general', label: 'Umum' },
];

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const humanizeCategory = (value) => String(value || 'umum')
  .replace(/[-_]+/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

export const getMediaCategoryLabel = (category) =>
  MEDIA_CATEGORIES.find((item) => item.value === String(category || ''))?.label
  || humanizeCategory(category);

export const resolveBackendAssetUrl = (url, fallback = '') => {
  if (!url) return fallback;
  if (/^https?:\/\//i.test(String(url))) return String(url);

  const normalizedPath = String(url).startsWith('/') ? String(url) : `/${String(url)}`;
  return BACKEND_URL ? `${BACKEND_URL}${normalizedPath}` : normalizedPath;
};

export const validateAdminImage = (file) => {
  if (!file) {
    throw new Error('Pilih file terlebih dahulu.');
  }

  if (!ALLOWED_IMAGE_TYPES.has(String(file.type || '').toLowerCase())) {
    throw new Error('Format file harus JPG, PNG, GIF, atau WEBP.');
  }

  if (Number(file.size || 0) > 5 * 1024 * 1024) {
    throw new Error('Ukuran file maksimal 5MB.');
  }
};

export const uploadAdminImage = async (
  file,
  {
    category = 'general',
    name,
    folder,
    prefix,
    registerInMedia = true,
  } = {},
) => {
  validateAdminImage(file);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category || 'general');
  formData.append('name', name || file.name || 'image');
  formData.append('registerInMedia', String(registerInMedia));

  if (folder) formData.append('folder', folder);
  if (prefix) formData.append('prefix', prefix);

  const token = localStorage.getItem('admin_token');
  const response = await axios.post(`${BACKEND_URL}/api/upload/image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  return response.data || {};
};
