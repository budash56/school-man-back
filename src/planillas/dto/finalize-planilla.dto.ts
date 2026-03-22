import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class FinalizePlanillaDto {
  @ApiPropertyOptional({ example: true, default: true })
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return true;
    }
    return value === true || value === 'true';
  })
  @IsOptional()
  @IsBoolean()
  allowPartial?: boolean = true;
}
