import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class TermGradeReportDto {
  @ApiProperty({ example: 101, description: 'Student identifier', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({ example: 15, description: 'Course identifier', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  courseId: number;

  @ApiProperty({ example: 4, description: 'Term identifier', minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  termId: number;
}
