import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateAttendanceDto {
  @ApiPropertyOptional({
    description: 'Updated attendance status',
    example: 'AE',
    enum: ['P', 'A', 'AE'],
  })
  @IsOptional()
  @IsIn(['P', 'A', 'AE'])
  status?: 'P' | 'A' | 'AE';

  @ApiPropertyOptional({
    description: 'Reason provided for the attendance change',
    example: 'Excused absence approved by coordinator',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  reasonNote?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when the absence was excused',
    example: '2025-02-10T14:30:00.000Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  excusedAt?: string;
}
