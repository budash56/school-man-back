import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { CoursePreferenceDto } from './course-preference.dto';
import { TeacherConstraintDto } from './teacher-constraint.dto';
import { SCHEDULE_DIVISIONS } from '../../timetable_slots/timetable-division.type';

export class GenerateTimetableDto {
  @ApiProperty({
    description: 'Target school year identifier',
    example: 2025,
  })
  @IsInt()
  @Min(1)
  schoolYearId: number;

  @ApiProperty({
    description: 'Division to generate (elementary, secondary, or senior)',
    enum: SCHEDULE_DIVISIONS,
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
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeacherConstraintDto)
  teacherConstraints?: TeacherConstraintDto[];

  @ApiPropertyOptional({
    description:
      'Optional per-course overrides such as double blocks or session counts.',
    type: CoursePreferenceDto,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CoursePreferenceDto)
  coursePreferences?: CoursePreferenceDto[];
}
