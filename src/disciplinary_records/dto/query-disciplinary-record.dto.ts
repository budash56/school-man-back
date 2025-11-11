import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

type Category = 'green' | 'yellow' | 'red' | 'last_notice';

export class QueryDisciplinaryRecordDto {
  @ApiPropertyOptional({ example: 1234, description: 'Filter by student id' })
  @IsOptional()
  @IsInt()
  @Min(1)
  studentId?: number;

  @ApiPropertyOptional({
    example: 'PRINCIPAL01',
    description: 'Filter by recordedBy national id',
  })
  @IsOptional()
  @IsString()
  recordedBy?: string;

  @ApiPropertyOptional({
    example: 'yellow',
    enum: ['green', 'yellow', 'red', 'last_notice'],
  })
  @IsOptional()
  @IsEnum(['green', 'yellow', 'red', 'last_notice'])
  category?: Category;

  @ApiPropertyOptional({
    example: '2025-01-01',
    description: 'Start date (inclusive)',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2025-01-31',
    description: 'End date (inclusive)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
