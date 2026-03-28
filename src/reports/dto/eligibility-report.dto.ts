import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class EligibilityReportDto {
  @ApiProperty({ example: 3, description: 'School year identifier', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  schoolYearId: number;

  @ApiProperty({ example: 10, description: 'Grade level to evaluate', minimum: 1, maximum: 11 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(11)
  gradeLevel: number;

  @ApiPropertyOptional({ example: 12, description: 'Optional class group filter', minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  classGroupId?: number;
}
