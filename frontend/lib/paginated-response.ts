// @ts-nocheck

export const createEmptyPageState = (pageSize = 10) => ({
  items: [],
  total: 0,
  page: 1,
  pageSize,
  totalPages: 1,
});

export const extractPaginatedResponse = (payload, fallbackPageSize = 10) => {
  const data = payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;

  if (Array.isArray(data)) {
    const total = data.length;
    return {
      items: data,
      total,
      page: 1,
      pageSize: total || fallbackPageSize,
      totalPages: total > 0 ? 1 : 1,
    };
  }

  if (data && typeof data === 'object' && Array.isArray(data.items)) {
    return {
      items: data.items,
      total: Number(data.total || 0),
      page: Number(data.page || 1),
      pageSize: Number(data.pageSize || fallbackPageSize),
      totalPages: Number(data.totalPages || 1),
    };
  }

  return createEmptyPageState(fallbackPageSize);
};
