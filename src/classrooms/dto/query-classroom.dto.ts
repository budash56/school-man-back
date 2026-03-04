import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  IsPositive,
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
    example: 1,
    description: 'Filter by building id',
  })
  @Transform(({ value }) =>
    value !== undefined ? parseInt(value, 10) : undefined,
  )
  @IsOptional()
  @IsInt()
  @IsPositive()
  buildingId?: number;

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
    description: 'Page size (1+)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number = 20;
}
