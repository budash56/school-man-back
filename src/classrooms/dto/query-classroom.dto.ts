import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class QueryClassroomDto {
  @ApiPropertyOptional({
    example: 'Main Building',
    description: 'Filter by building name',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  building?: string;

  @ApiPropertyOptional({
    example: 'Room',
    description: 'Keyword search within name',
  })
  @IsOptional()
  @IsString()
  q?: string;

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
    description: 'Page size (1-100)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
