import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCurriculumItemDto {
  @ApiProperty({
    example: 5,
    description: 'Curriculum identifier that will receive the subject',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  curriculumId: number;

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
