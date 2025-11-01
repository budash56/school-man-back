export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export const PAGINATION_METADATA = {
  data: {
    description: 'Collection of items for the current page',
    isArray: true,
  },
  total: {
    description: 'Total number of items available across all pages',
    example: 120,
  },
  page: {
    description: 'Current page number (1-indexed)',
    example: 1,
  },
  pageSize: {
    description: 'Number of items returned per page',
    example: 25,
  },
} as const;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export function resolvePagination(
  rawPage?: number,
  rawPageSize?: number,
): { page: number; pageSize: number } {
  const page = !rawPage || rawPage < DEFAULT_PAGE ? DEFAULT_PAGE : Math.floor(rawPage);

  let pageSize =
    !rawPageSize || rawPageSize < 1 ? DEFAULT_PAGE_SIZE : Math.floor(rawPageSize);

  if (pageSize > MAX_PAGE_SIZE) {
    pageSize = MAX_PAGE_SIZE;
  }

  return { page, pageSize };
}

export function buildPaginationResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    pageSize,
  };
}
