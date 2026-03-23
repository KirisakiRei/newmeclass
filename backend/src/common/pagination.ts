export type PaginationInput = {
  page?: string | number | null;
  pageSize?: string | number | null;
  limit?: string | number | null;
};

export type ResolvedPagination = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function resolvePagination(input: PaginationInput = {}, defaults: { page?: number; pageSize?: number; maxPageSize?: number } = {}): ResolvedPagination {
  const fallbackPage = Math.max(Number(defaults.page || 1), 1);
  const fallbackPageSize = Math.max(Number(defaults.pageSize || 10), 1);
  const maxPageSize = Math.max(Number(defaults.maxPageSize || 100), fallbackPageSize);

  const rawPage = Number(input.page ?? fallbackPage);
  const rawPageSize = Number(input.pageSize ?? input.limit ?? fallbackPageSize);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : fallbackPage;
  const pageSize = Math.min(
    Math.max(Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.floor(rawPageSize) : fallbackPageSize, 1),
    maxPageSize,
  );

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function buildPaginatedResult<T>(items: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
  const normalizedTotal = Math.max(Number(total || 0), 0);
  const normalizedPageSize = Math.max(Number(pageSize || 1), 1);
  const totalPages = normalizedTotal > 0 ? Math.ceil(normalizedTotal / normalizedPageSize) : 1;
  return {
    items,
    total: normalizedTotal,
    page,
    pageSize: normalizedPageSize,
    totalPages,
  };
}
