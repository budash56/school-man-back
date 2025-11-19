import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import type { TimetableShiftPreference } from './teacher-constraint.dto';

export class CoursePreferenceDto {
  @ApiPropertyOptional({
    description: 'Course identifier that should override the default behaviour',
    example: 101,
  })
  @IsInt()
  @Min(1)
  courseId: number;

  @ApiPropertyOptional({
    description:
      'Preferred shift for this course. Acts as a hard constraint, so only slots in this shift will be considered.',
    enum: ['any', 'morning', 'afternoon'],
  })
  @IsOptional()
  @IsEnum(['any', 'morning', 'afternoon'])
  preferredShift?: TimetableShiftPreference;

  @ApiPropertyOptional({
    description:
      'Number of consecutive slots required for each session of this course (e.g. 2 for double block). Defaults to 1.',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  blockLength?: number;

  @ApiPropertyOptional({
    description:
      'Total sessions per week override. When omitted, the generator falls back to `courseInstance.weeklyHours`.',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  sessionsPerWeek?: number;
}
