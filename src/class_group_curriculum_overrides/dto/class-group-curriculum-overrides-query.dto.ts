import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class ClassGroupCurriculumOverridesQueryDto {
  @ApiPropertyOptional({
    example: 20,
    description: 'Filter overrides by class group identifier',
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : Number.parseInt(value, 10),
  )
  @IsOptional()
  @IsInt()
  @IsPositive()
  classGroupId?: number;

  @ApiPropertyOptional({
    example: 55,
    description: 'Filter overrides by curriculum item identifier',
  })
  @Transform(({ value }) =>
    value === undefined || value === null
      ? undefined
      : Number.parseInt(value, 10),
  )
  @IsOptional()
  @IsInt()
  @IsPositive()
  curriculumItemId?: number;
}
