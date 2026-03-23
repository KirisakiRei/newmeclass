export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const emptyPaginated = (page = 1, pageSize = DEFAULT_PAGE_SIZE) => ({
  items: [],
  total: 0,
  page,
  pageSize,
  totalPages: 1,
});

export const normalizePaginatedPayload = (payload, fallbackPage = 1, fallbackPageSize = DEFAULT_PAGE_SIZE) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      ...emptyPaginated(fallbackPage, fallbackPageSize),
      items: Array.isArray(payload) ? payload : [],
      total: Array.isArray(payload) ? payload.length : 0,
      totalPages: Array.isArray(payload) && payload.length > 0 ? Math.ceil(payload.length / fallbackPageSize) : 1,
    };
  }

  const items = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.data)
      ? payload.data
      : [];

  const total = Number(payload.total ?? items.length ?? 0) || 0;
  const page = Number(payload.page ?? fallbackPage) || fallbackPage;
  const pageSize = Number(payload.pageSize ?? fallbackPageSize) || fallbackPageSize;
  const totalPages = Number(payload.totalPages ?? Math.max(Math.ceil(total / Math.max(pageSize, 1)), 1)) || 1;

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  };
};
