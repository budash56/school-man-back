import { buildPaginationResult, resolvePagination } from './pagination';

describe('pagination helpers', () => {
  it('uses defaults for invalid page values', () => {
    const { page, pageSize } = resolvePagination(0, 1000);
    expect(page).toBe(1);
    expect(pageSize).toBe(1000);
  });

  it('returns paginated result wrapper', () => {
    const { page, pageSize } = resolvePagination(2, 15);
    const result = buildPaginationResult([1, 2], 10, page, pageSize);

    expect(result).toEqual({
      data: [1, 2],
      total: 10,
      page: 2,
      pageSize: 15,
    });
  });
});
