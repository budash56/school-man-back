import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, IsOptional, Min } from 'class-validator';

export class AttendanceQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by student identifier',
    example: 101,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  studentId?: number;

  @ApiPropertyOptional({
    description: 'Filter by course identifier',
    example: 205,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  courseId?: number;

  @ApiPropertyOptional({
    description: 'Filter by attendance status',
    example: 'A',
    enum: ['P', 'A', 'AE'],
  })
  @IsOptional()
  @IsIn(['P', 'A', 'AE'])
  status?: 'P' | 'A' | 'AE';

  @ApiPropertyOptional({
    description: 'Include attendances on or after this date (ISO 8601)',
    example: '2025-02-01',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Include attendances on or before this date (ISO 8601)',
    example: '2025-02-28',
    format: 'date',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Teacher scope filter for own courses versus class groups',
    example: 'group',
    enum: ['own', 'group'],
  })
  @IsOptional()
  @IsIn(['own', 'group'])
  scope?: 'own' | 'group';

  @ApiPropertyOptional({
    description: 'Page number for paginated results',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    example: 25,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}
