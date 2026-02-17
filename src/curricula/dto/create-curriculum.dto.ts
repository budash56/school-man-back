import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateCurriculumItemDto {
  @ApiProperty({
    example: 12,
    description: 'Identifier of the subject assigned to this curriculum item',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  subjectId: number;

  @ApiPropertyOptional({
    example: 4,
    default: 0,
    description: 'Weekly teaching hours for this subject',
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  weeklyHours: number = 0;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description: 'Whether this subject must be scheduled in a double session',
  })
  @IsOptional()
  @IsBoolean()
  doubleSessionRequired?: boolean;

  @ApiPropertyOptional({
    example: 'Lab requires a double block on Thursdays',
    description: 'Optional notes for scheduling or curriculum review',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class CreateCurriculumDto {
  @ApiProperty({
    example: 10,
    description: 'Grade level for this curriculum (1-11)',
    minimum: 1,
    maximum: 11,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(11)
  gradeLevel: number;

  @ApiProperty({
    example: 'Grade 10 Curriculum',
    maxLength: 120,
    description: 'Human readable curriculum name',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Whether this curriculum is active for planning',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Curriculum items for the grade level',
    type: CreateCurriculumItemDto,
    isArray: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateCurriculumItemDto)
  items: CreateCurriculumItemDto[];
}
