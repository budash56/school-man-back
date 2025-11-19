import { ApiProperty } from '@nestjs/swagger';
import type { TimetableShiftPreference } from './teacher-constraint.dto';

export class ProposedAssignmentDto {
  @ApiProperty({ example: 101 })
  courseId: number;

  @ApiProperty({ example: 12 })
  classGroupId: number;

  @ApiProperty({ example: '900100' })
  teacherId: string;

  @ApiProperty({ example: 7 })
  slotId: number;

  @ApiProperty({ example: 3 })
  dayOfWeek: number;

  @ApiProperty({ example: '09:00:00' })
  startTime: string;

  @ApiProperty({ example: '09:45:00' })
  endTime: string;

  @ApiProperty({
    example: 'morning',
    enum: ['morning', 'afternoon'],
  })
  shift: Exclude<TimetableShiftPreference, 'any'>;

  @ApiProperty({ example: 'Mathematics - 1001' })
  label: string;
}

export class UnassignedSessionDto {
  @ApiProperty({ example: 101 })
  courseId: number;

  @ApiProperty({ example: 12 })
  classGroupId: number;

  @ApiProperty({ example: '900100' })
  teacherId: string;

  @ApiProperty({ example: 2 })
  blockLength: number;

  @ApiProperty({
    example: 'NO_SLOT_AVAILABLE',
  })
  reason: string;
}

export class GenerationPreviewDto {
  @ApiProperty({ type: ProposedAssignmentDto, isArray: true })
  assignments: ProposedAssignmentDto[];

  @ApiProperty({ type: UnassignedSessionDto, isArray: true })
  unassignedSessions: UnassignedSessionDto[];
}

export class GenerationApplyResultDto extends GenerationPreviewDto {
  @ApiProperty({
    description: 'Assignments persisted during the apply step',
    type: ProposedAssignmentDto,
    isArray: true,
  })
  persistedAssignments: ProposedAssignmentDto[];

  @ApiProperty({
    description:
      'Assignments that failed to persist (typically due to race conditions with manual edits)',
    type: UnassignedSessionDto,
    isArray: true,
  })
  failedToPersist: UnassignedSessionDto[];
}
