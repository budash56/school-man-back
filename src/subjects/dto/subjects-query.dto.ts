import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export class SubjectsQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsInt()
  @IsPositive()
  page?: number;

  @ApiPropertyOptional({
    example: DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
  })
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;

  @ApiPropertyOptional({
    example: 'algebra',
    description: 'Filter by partial match in subject code or name',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by subject area ID',
  })
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsInt()
  @Min(1)
  areaId?: number;
}

export const SUBJECTS_DEFAULT_PAGE_SIZE = DEFAULT_PAGE_SIZE;
export const SUBJECTS_MAX_PAGE_SIZE = MAX_PAGE_SIZE;
