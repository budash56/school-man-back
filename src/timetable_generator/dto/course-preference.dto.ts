import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
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

  @ApiPropertyOptional({
    description:
      'Maximum number of sessions per day for this course. Overrides the default.',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSessionsPerDay?: number;

  @ApiPropertyOptional({
    description:
      'Minimum gap (in slots) between sessions of this course on the same day.',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minGapSlots?: number;

  @ApiPropertyOptional({
    description:
      'Allows consecutive sessions of the same subject (double block).',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowDoubleBlock?: boolean;

  @ApiPropertyOptional({
    description:
      'Explicit days of week (1=Monday ... 7=Sunday) to target for this course.',
    isArray: true,
    type: Number,
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  targetDays?: number[];
}
