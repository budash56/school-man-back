import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryAuditLogDto {
  @ApiPropertyOptional({ example: 'students', description: 'Filter by entity name' })
  @IsOptional()
  @IsString()
  entityName?: string;

  @ApiPropertyOptional({ example: 'UPDATE', description: 'Filter by action' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: '900001', description: 'Filter by performer national ID' })
  @IsOptional()
  @IsString()
  performedBy?: string;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z', description: 'Filter from timestamp (inclusive)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2025-01-31T23:59:59.999Z', description: 'Filter to timestamp (inclusive)' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number (1+)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'Page size (1-100)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
