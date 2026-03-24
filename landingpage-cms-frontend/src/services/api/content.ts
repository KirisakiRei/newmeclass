import { request, upload } from './client';

export const contactAPI = {
  create: (data: Record<string, unknown>) =>
    request('/contacts', {
      method: 'POST',
      body: data,
    }),
};

export const certificateAPI = {
  verify: (certificateNumber: string) => request(`/certificates/verify/${encodeURIComponent(certificateNumber)}`),
};

export const articlesAPI = {
  getAll: (params?: Record<string, string | number | boolean | undefined>) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, raw]) => {
      if (raw === undefined || raw === null || raw === '') return;
      query.set(key, String(raw));
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request(`/articles${suffix}`);
  },
  getById: (id: string) => request(`/articles/${encodeURIComponent(id)}`),
  create: (data: Record<string, unknown>) =>
    request('/articles', { method: 'POST', body: data, tokenKey: 'admin_token' }),
  update: (id: string, data: Record<string, unknown>) =>
    request(`/articles/${encodeURIComponent(id)}`, { method: 'PUT', body: data, tokenKey: 'admin_token' }),
  bulkSync: (items: Array<Record<string, unknown>>) =>
    request('/articles/bulk', { method: 'PUT', body: { items }, tokenKey: 'admin_token' }),
  delete: (id: string) => request(`/articles/${encodeURIComponent(id)}`, { method: 'DELETE', tokenKey: 'admin_token' }),
};

export const mediaAPI = {
  getAll: (params?: Record<string, string | number | boolean | undefined>) => {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, raw]) => {
      if (raw === undefined || raw === null || raw === '') return;
      query.set(key, String(raw));
    });
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request(`/media${suffix}`);
  },
  create: (data: Record<string, unknown>) =>
    request('/media', { method: 'POST', body: data, tokenKey: 'admin_token' }),
  update: (id: string, data: Record<string, unknown>) =>
    request(`/media/${encodeURIComponent(id)}`, { method: 'PUT', body: data, tokenKey: 'admin_token' }),
  delete: (id: string) =>
    request(`/media/${encodeURIComponent(id)}`, { method: 'DELETE', tokenKey: 'admin_token' }),
  uploadImage: async (file: File, options?: { category?: string; folder?: string; prefix?: string; name?: string; registerInMedia?: boolean }) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.category) formData.append('category', options.category);
    if (options?.folder) formData.append('folder', options.folder);
    if (options?.prefix) formData.append('prefix', options.prefix);
    if (options?.name) formData.append('name', options.name);
    if (options?.registerInMedia !== undefined) {
      formData.append('registerInMedia', String(options.registerInMedia));
    }
    return upload('/upload/image', formData, 'admin_token');
  },
};
