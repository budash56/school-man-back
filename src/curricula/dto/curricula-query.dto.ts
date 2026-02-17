import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class CurriculaQueryDto {
  @ApiPropertyOptional({
    example: 10,
    description: 'Filters curricula by grade level (1-11)',
    minimum: 1,
    maximum: 11,
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : Number.parseInt(value, 10),
  )
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(11)
  gradeLevel?: number;

  @ApiPropertyOptional({
    description: 'Filters by active curricula when provided',
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
}
