import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsPositive } from 'class-validator';

export class ImportPlanillaDto {
  @ApiProperty({ example: 1 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsPositive()
  schoolYearId: number;

  @ApiPropertyOptional({ example: true, default: true })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return true;
    }
    return value === true || value === 'true';
  })
  @IsOptional()
  @IsBoolean()
  replaceExisting?: boolean = true;
}
