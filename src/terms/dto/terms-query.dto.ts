import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { TermName } from './term-name.enum';

export class TermsQueryDto {
  @ApiPropertyOptional({
    description: 'Filters terms that belong to active or inactive school years',
    example: true,
  })
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : value === 'true' || value === true,
  )
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Filters by the exact term name',
    enum: TermName,
  })
  @IsOptional()
  @IsEnum(TermName)
  name?: TermName;

  @ApiPropertyOptional({
    description: 'Filters terms by their parent school year ID',
    example: 1,
  })
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : Number.parseInt(value, 10),
  )
  @IsOptional()
  @IsInt()
  @IsPositive()
  schoolYearId?: number;
}
