import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateCurriculumItemDto {
  @ApiPropertyOptional({
    example: 4,
    description: 'Weekly teaching hours for this subject',
    minimum: 0,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  weeklyHours?: number;

  @ApiPropertyOptional({
    example: true,
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
