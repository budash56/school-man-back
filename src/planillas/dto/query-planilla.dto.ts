import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Min, IsPositive } from 'class-validator';

export class QueryPlanillaDto {
  @ApiPropertyOptional({ example: 1 })
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsInt()
  @IsPositive()
  schoolYearId?: number;

  @ApiPropertyOptional({ example: 9 })
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : undefined))
  @IsOptional()
  @IsInt()
  @Min(1)
  gradeLevel?: number;

  @ApiPropertyOptional({ example: '901' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{3,4}$/)
  groupCode?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 1))
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 20))
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number = 20;
}
