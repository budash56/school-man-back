import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Min,
  IsInt,
} from 'class-validator';

export class QueryNotificationDto {
  @ApiPropertyOptional({
    example: 'Attendance',
    description: 'Filter by title keyword',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by active status',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Page number (1+)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    description: 'Page size (1+)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number = 20;
}
