import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export class SubjectAreasQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Transform(({ value }) =>
    value !== undefined ? parseInt(value, 10) : undefined,
  )
  @IsOptional()
  @IsInt()
  @IsPositive()
  page?: number;

  @ApiPropertyOptional({
    example: DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
  })
  @Transform(({ value }) =>
    value !== undefined ? parseInt(value, 10) : undefined,
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;

  @ApiPropertyOptional({
    example: 'math',
    description:
      'Filter by partial match in code or name using case-insensitive search',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Include subjects nested under each area',
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : value === 'true' || value === true,
  )
  @IsOptional()
  @IsBoolean()
  includeSubjects?: boolean;
}
