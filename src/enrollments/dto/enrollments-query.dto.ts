import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class EnrollmentsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter results by student identifier',
    example: 501,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  studentId?: number;

  @ApiPropertyOptional({
    description: 'Filter results by class group identifier',
    example: 32,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  classGroupId?: number;

  @ApiPropertyOptional({
    description: 'Filter results by grade level',
    example: 10,
    minimum: 1,
    maximum: 11,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(11)
  gradeLevel?: number;

  @ApiPropertyOptional({
    description: 'Filter results by school year identifier',
    example: 2026,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  schoolYearId?: number;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Page size for pagination',
    example: 25,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Filter by active enrollments',
    example: true,
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : value === 'true' || value === true,
  )
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Filter to only enrollments without class group assignment',
    example: true,
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : value === 'true' || value === true,
  )
  @IsOptional()
  @IsBoolean()
  unassigned?: boolean;
}
