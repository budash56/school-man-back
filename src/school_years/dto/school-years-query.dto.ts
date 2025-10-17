import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SchoolYearsQueryDto {
  @ApiPropertyOptional({
    description: 'Filters by active school years when provided',
    example: true,
  })
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : value === 'true' || value === true,
  )
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Filters by exact year name',
    example: '2025',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
