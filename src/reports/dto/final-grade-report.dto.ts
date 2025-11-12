import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class FinalGradeReportDto {
  @ApiProperty({ example: 101, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({ example: 15, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseId: number;

  @ApiProperty({ example: 3, description: 'School year identifier', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  schoolYearId: number;
}
