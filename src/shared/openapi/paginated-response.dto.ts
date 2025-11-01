import { ApiProperty } from '@nestjs/swagger';

export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'Collection of items for the current page',
    isArray: true,
  })
  data: T[];

  @ApiProperty({
    description: 'Total number of items available across all pages',
    example: 120,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number (1-indexed)',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items returned per page',
    example: 25,
  })
  pageSize: number;
}
