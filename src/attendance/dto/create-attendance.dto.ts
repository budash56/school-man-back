import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsIn, IsInt, Min } from 'class-validator';

export class CreateAttendanceDto {
  @ApiProperty({
    description: 'Identifier of the student the attendance belongs to',
    example: 101,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({
    description: 'Identifier of the course the attendance refers to',
    example: 205,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  courseId: number;

  @ApiProperty({
    description: 'Identifier of the timetable slot when the lesson occurred',
    example: 12,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  slotId: number;

  @ApiProperty({
    description: 'Date of the attendance entry in ISO 8601 format',
    example: '2025-02-10',
    format: 'date',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: 'Recorded attendance status',
    example: 'P',
    enum: ['P', 'A', 'AE'],
  })
  @IsIn(['P', 'A', 'AE'])
  status: 'P' | 'A' | 'AE';
}
