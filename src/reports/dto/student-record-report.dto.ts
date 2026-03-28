import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class StudentRecordReportDto {
  @ApiProperty({ example: 101, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({ example: 3, description: 'School year identifier', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  schoolYearId: number;

  @ApiPropertyOptional({
    example: '1,2,3',
    description: 'Comma or space separated periods, or "all"',
  })
  @IsOptional()
  @IsString()
  periods?: string;
}
