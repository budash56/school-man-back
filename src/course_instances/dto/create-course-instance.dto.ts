import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCourseInstanceDto {
  @ApiProperty({
    example: 12,
    description: 'Identifier of the related subject',
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : Number.parseInt(value, 10),
  )
  @IsInt()
  @IsPositive()
  subjectId: number;

  @ApiProperty({
    example: 10,
    description: 'Grade level served by this course instance (1-11)',
    minimum: 1,
    maximum: 11,
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : Number.parseInt(value, 10),
  )
  @IsInt()
  @Min(1)
  @Max(11)
  gradeLevel: number;

  @ApiProperty({ example: 3, description: 'School year identifier' })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : Number.parseInt(value, 10),
  )
  @IsInt()
  @IsPositive()
  schoolYearId: number;

  @ApiPropertyOptional({
    example: 'MATH-10-Y2025',
    description:
      'Custom course code. When omitted, it is generated automatically',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  courseCode?: string;

  @ApiProperty({
    example: 'Mathematics Grade 10',
    maxLength: 120,
    description: 'Human readable course instance name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  courseName: string;

  @ApiPropertyOptional({
    example: 4,
    default: 0,
    description: 'Weekly teaching hours for this course instance',
    minimum: 0,
  })
  @Transform(({ value }) =>
    value === undefined || value === null ? 0 : Number.parseInt(value, 10),
  )
  @IsInt()
  @Min(0)
  weeklyHours: number = 0;

  @ApiPropertyOptional({
    example: true,
    description:
      'Flag to enable or disable the course instance without deleting it',
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : value === 'true' || value === true,
  )
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
