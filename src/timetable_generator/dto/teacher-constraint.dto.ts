import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export type TimetableShiftPreference = 'any' | 'morning' | 'afternoon';

export class TeacherConstraintDto {
  @ApiPropertyOptional({
    description:
      'Teacher identifier (national ID) whose availability constraints should be considered',
    example: '900100',
  })
  @IsString()
  teacherId: string;

  @ApiPropertyOptional({
    description:
      'Preferred shift for this teacher. When set to morning/afternoon, only slots within that shift are considered.',
    enum: ['any', 'morning', 'afternoon'],
    default: 'any',
    example: 'morning',
  })
  @IsOptional()
  @IsEnum(['any', 'morning', 'afternoon'])
  preferredShift?: TimetableShiftPreference;

  @ApiPropertyOptional({
    description:
      'Prevents assigning the teacher to the latest slot of the day (useful for teachers who cannot work late).',
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  avoidLastSlot?: boolean;
}
