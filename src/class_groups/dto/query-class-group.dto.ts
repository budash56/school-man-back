import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

export class QueryClassGroupDto {
  @ApiPropertyOptional({ example: 1, description: 'Filter by school year id' })
  @IsOptional()
  @IsInt()
  @Min(1)
  schoolYearId?: number;

  @ApiPropertyOptional({ example: 10, description: 'Filter by grade level (1-11)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(11)
  gradeLevel?: number;

  @ApiPropertyOptional({ example: '01', description: 'Filter by two-digit section code' })
  @IsOptional()
  @Matches(/^[0-9]{2}$/)
  section?: string;

  @ApiPropertyOptional({ example: 'algebra', description: 'Full-text search term' })
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number (1+)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'Page size (1-100)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
