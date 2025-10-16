import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive, IsString, Max, Min } from 'class-validator';

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export class StudentsQueryDto {
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
    example: 'Juana',
    description: 'Filter by partial match in first name, last name, or nationalId',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({
    example: 2025,
    minimum: 1,
    description: 'Filters students who have an enrollment in the given school year',
  })
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsInt()
  @Min(1)
  year?: number;
}

export const STUDENTS_DEFAULT_PAGE_SIZE = DEFAULT_PAGE_SIZE;
export const STUDENTS_MAX_PAGE_SIZE = MAX_PAGE_SIZE;
