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

export class CourseInstancesQueryDto {
  @ApiPropertyOptional({
    example: 3,
    description: 'Filters course instances by school year identifier',
  })
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : Number.parseInt(value, 10),
  )
  @IsOptional()
  @IsInt()
  @IsPositive()
  schoolYearId?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Filters course instances by grade level',
    minimum: 1,
    maximum: 11,
  })
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : Number.parseInt(value, 10),
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(11)
  gradeLevel?: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'Filters course instances by subject identifier',
  })
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : Number.parseInt(value, 10),
  )
  @IsOptional()
  @IsInt()
  @IsPositive()
  subjectId?: number;

  @ApiPropertyOptional({
    example: 'math',
    description: 'Search keyword applied to course code and name',
  })
  @IsOptional()
  @IsString()
  q?: string;
}
