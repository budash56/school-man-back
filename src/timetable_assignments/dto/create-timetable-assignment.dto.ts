import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTimetableAssignmentDto {
  @ApiProperty({ example: 12, description: 'Course identifier' })
  @IsInt()
  @Min(1)
  courseId: number;

  @ApiProperty({ example: 4, description: 'Timetable slot identifier' })
  @IsInt()
  @Min(1)
  slotId: number;

  @ApiPropertyOptional({
    example: '900100',
    description: 'Teacher national ID',
  })
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiPropertyOptional({ example: 7, description: 'Class group identifier' })
  @IsOptional()
  @IsInt()
  @Min(1)
  classGroupId?: number;

  @ApiPropertyOptional({ example: 2, description: 'Classroom identifier' })
  @IsOptional()
  @IsInt()
  @Min(1)
  classroomId?: number;
}
