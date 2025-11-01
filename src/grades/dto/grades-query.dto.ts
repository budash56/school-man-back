import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class GradesQueryDto {
  @ApiPropertyOptional({
    description: 'Filter results by student identifier',
    example: 301,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  studentId?: number;

  @ApiPropertyOptional({
    description: 'Filter results by course identifier',
    example: 410,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  courseId?: number;

  @ApiPropertyOptional({
    description: 'Filter results by term identifier',
    example: 12,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  termId?: number;

  @ApiPropertyOptional({
    description: 'Filter results by school year identifier',
    example: 2025,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  schoolYearId?: number;

  @ApiPropertyOptional({
    description: 'Page number for paginated results',
    example: 2,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 50,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}
