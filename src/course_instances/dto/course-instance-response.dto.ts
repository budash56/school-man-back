import { ApiProperty } from '@nestjs/swagger';

export class CourseInstanceResponseDto {
  @ApiProperty({ example: 42 })
  courseInstanceId: number;

  @ApiProperty({ example: 12 })
  subjectId: number;

  @ApiProperty({ example: 'MATH' })
  subjectCode: string;

  @ApiProperty({ example: 'SCI' })
  subjectAreaCode: string | null;

  @ApiProperty({ example: 'Mathematics' })
  subjectName: string;

  @ApiProperty({ example: 10 })
  gradeLevel: number;

  @ApiProperty({ example: 4 })
  weeklyHours: number;

  @ApiProperty({ example: 'MATH-10-Y2025' })
  courseCode: string;

  @ApiProperty({ example: 'Mathematics Grade 10' })
  courseName: string;

  @ApiProperty({ example: true })
  isActive: boolean | null;

  @ApiProperty({ example: 3 })
  schoolYearId: number;

  @ApiProperty({ example: '2025' })
  schoolYearName: string;
}
