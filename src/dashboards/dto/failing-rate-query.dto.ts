import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class FailingRateQueryDto {
  @ApiPropertyOptional({ example: 5, description: 'Subject identifier' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  subjectId?: number;

  @ApiPropertyOptional({ example: 12, description: 'Term identifier' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  termId?: number;

  @ApiPropertyOptional({ example: 3, description: 'School year identifier' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  schoolYearId?: number;
}
