import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAuditLogDto {
  @ApiProperty({
    example: 'students',
    description: 'Entity impacted by the action',
  })
  @IsString()
  @MinLength(1)
  entityName: string;

  @ApiPropertyOptional({
    example: 42,
    description: 'Primary key of the affected entity',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  entityId?: number;

  @ApiProperty({
    example: 'UPDATE',
    description: 'Action performed (max 20 characters)',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  action: string;

  @ApiPropertyOptional({
    type: Object,
    example: { before: { isActive: false }, after: { isActive: true } },
    description: 'Optional JSON payload describing the change',
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;

  @ApiProperty({
    example: '900001',
    description: 'National ID of the user who performed the action',
  })
  @IsString()
  @MinLength(1)
  performedBy: string;

  @ApiPropertyOptional({
    example: '2025-01-15T14:30:00.000Z',
    description: 'Timestamp of the action (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  performedAt?: string;
}
