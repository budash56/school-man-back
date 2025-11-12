import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, Min } from 'class-validator';

export class AttendanceSheetQueryDto {
  @ApiProperty({ example: 10, description: 'Class group identifier' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  classGroupId: number;

  @ApiProperty({
    example: '2025-02-15',
    description: 'Date for which the roster is generated (YYYY-MM-DD)',
  })
  @IsDateString()
  date: string;
}
