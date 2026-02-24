import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CoursePreferenceDto } from './course-preference.dto';
import { TeacherConstraintDto } from './teacher-constraint.dto';
import { SCHEDULE_DIVISIONS } from '../../timetable_slots/timetable-division.type';
export class BlockedSlotDto {
  @ApiPropertyOptional({
    description: 'Day of week (1=Monday ... 7=Sunday).',
    minimum: 1,
    maximum: 7,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @ApiPropertyOptional({
    description: 'Blocked start time (HH:mm or HH:mm:ss).',
    example: '10:50:00',
  })
  @IsString()
  startTime: string;

  @ApiPropertyOptional({
    description: 'Blocked end time (HH:mm or HH:mm:ss).',
    example: '11:20:00',
  })
  @IsString()
  endTime: string;
}

export class GenerateTimetableDto {
  @ApiProperty({
    description: 'Target school year identifier',
    example: 2026,
  })
  @IsInt()
  @Min(1)
  schoolYearId: number;

  @ApiProperty({
    description: 'Division to generate (elementary, secondary, or senior)',
    enum: SCHEDULE_DIVISIONS,
    example: 'secondary',
  })
  @IsIn(SCHEDULE_DIVISIONS)
  division: string;

  @ApiProperty({
    description:
      'Maximum number of slots a teacher can cover during the week (applies to every teacher unless a constraint is provided externally).',
    example: 18,
  })
  @IsInt()
  @Min(1)
  teacherWeeklyHourCap: number;

  @ApiPropertyOptional({
    description:
      'Optional list of teacher constraints (e.g. availability per shift, avoid last slot).',
    type: TeacherConstraintDto,
    isArray: true,
    example: [
      {
        teacherId: '900100',
        preferredShift: 'morning',
        avoidLastSlot: true,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeacherConstraintDto)
  teacherConstraints?: TeacherConstraintDto[];

  @ApiPropertyOptional({
    description:
      'Try to balance sessions across available days for each class group when possible.',
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  balanceAcrossDays?: boolean;

  @ApiPropertyOptional({
    description:
      'Avoid placing the same subject in consecutive slots for a class group.',
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  avoidConsecutiveSameSubject?: boolean;

  @ApiPropertyOptional({
    description:
      'Default maximum number of sessions per day for a course when no per-course override is provided.',
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxSessionsPerDayDefault?: number;

  @ApiPropertyOptional({
    description:
      'Default minimum gap (in slots) between sessions of the same course on the same day.',
    minimum: 0,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  minGapSlotsDefault?: number;

  @ApiPropertyOptional({
    description:
      'Optional per-course overrides such as double blocks or session counts.',
    type: CoursePreferenceDto,
    isArray: true,
    example: [
      {
        courseId: 1201,
        sessionsPerWeek: 4,
        blockLength: 1,
        maxSessionsPerDay: 1,
        minGapSlots: 1,
      },
      {
        courseId: 1202,
        sessionsPerWeek: 2,
        blockLength: 2,
        allowDoubleBlock: true,
        targetDays: [1, 3, 5],
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoursePreferenceDto)
  coursePreferences?: CoursePreferenceDto[];

  @ApiPropertyOptional({
    description:
      'Explicit blocked/break slots to avoid (e.g. lunch break). Times should match slot times.',
    type: BlockedSlotDto,
    isArray: true,
    example: [
      {
        dayOfWeek: 1,
        startTime: '10:50:00',
        endTime: '11:20:00',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockedSlotDto)
  blockedSlots?: BlockedSlotDto[];
}
