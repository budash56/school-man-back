import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class AttendanceWeeklyQueryDto {
  @ApiPropertyOptional({
    description: 'Grade level filter',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  grade?: number;

  @ApiPropertyOptional({
    description: 'Number of weeks to include (default 8)',
    example: 8,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(52)
  weeks?: number;
}
