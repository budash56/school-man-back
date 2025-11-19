import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Between } from 'typeorm';
import { CoursesRepository } from '../courses/courses.repository';
import { TimetableSlotRepository } from '../timetable_slots/timetable_slots.repository';
import { TimetableAssignmentsRepository } from '../timetable_assignments/timetable_assignments.repository';
import { TimetableAssignmentsService } from '../timetable_assignments/timetable_assignments.service';
import { GenerateTimetableDto } from './dto/generate-timetable.dto';
import {
  GenerationApplyResultDto,
  GenerationPreviewDto,
  ProposedAssignmentDto,
  UnassignedSessionDto,
} from './dto/generation-result.dto';
import {
  TeacherConstraintDto,
  TimetableShiftPreference,
} from './dto/teacher-constraint.dto';
import { CoursePreferenceDto } from './dto/course-preference.dto';
import { TimetableSlot } from '../timetable_slots/timetable_slots.entity';
import { Courses } from '../courses/courses.entity';
import { TimetableAssignments } from '../timetable_assignments/timetable_assignments.entity';
import type { SanitizedUser } from '../auth/auth.types';
import type { ScheduleDivision } from '../timetable_slots/timetable-division.type';

type SlotWithMeta = TimetableSlot & {
  shift: Exclude<TimetableShiftPreference, 'any'>;
  startSeconds: number;
  endSeconds: number;
  isLastOfDay: boolean;
};

type SessionDemand = {
  courseId: number;
  classGroupId: number;
  teacherId: string;
  blockLength: number;
  preferredShift: TimetableShiftPreference;
  label: string;
};

type GradeRange = {
  min: number;
  max: number;
};

@Injectable()
export class TimetableGeneratorService {
  private readonly logger = new Logger(TimetableGeneratorService.name);

  constructor(
    private readonly coursesRepository: CoursesRepository,
    private readonly slotRepository: TimetableSlotRepository,
    private readonly assignmentsRepository: TimetableAssignmentsRepository,
    private readonly assignmentsService: TimetableAssignmentsService,
  ) {}

  async preview(criteria: GenerateTimetableDto): Promise<GenerationPreviewDto> {
    const gradeRange = this.resolveDivisionRange(
      criteria.division as ScheduleDivision,
    );
    await this.assertTeacherCapacity(criteria, gradeRange);

    const [courses, slots, existingAssignments] = await Promise.all([
      this.loadCourses(criteria.schoolYearId, gradeRange),
      this.loadSlots(criteria.division as ScheduleDivision),
      this.loadAssignments(criteria.schoolYearId, gradeRange),
    ]);

    if (slots.length === 0) {
      throw new BadRequestException('No timetable slots available');
    }

    if (courses.length === 0) {
      return { assignments: [], unassignedSessions: [] };
    }

    const plan = this.buildPlan({
      courses,
      slots,
      existingAssignments,
      criteria,
    });

    this.logger.debug(
      `Preview for schoolYear=${criteria.schoolYearId}: proposed=${plan.assignments.length} unassigned=${plan.unassignedSessions.length}`,
    );

    return plan;
  }

  private async assertTeacherCapacity(
    criteria: GenerateTimetableDto,
    gradeRange: GradeRange,
  ): Promise<void> {
    const teacherCap = criteria.teacherWeeklyHourCap;
    if (!teacherCap || teacherCap <= 0) {
      return;
    }

    const schoolYearId = criteria.schoolYearId.toString();
    const qb = this.coursesRepository.createQueryBuilder('course');

    const rows = await qb
      .innerJoin('course.courseInstance', 'instance')
      .innerJoin('instance.subject', 'subject')
      .select('instance.gradeLevel', 'gradeLevel')
      .addSelect('subject.subjectCode', 'subjectCode')
      .addSelect('subject.name', 'subjectName')
      .addSelect('instance.weeklyHours', 'weeklyHours')
      .addSelect('COUNT(DISTINCT course.classGroupId)', 'sections')
      .addSelect(
        "COUNT(DISTINCT COALESCE(NULLIF(course.teacherId, ''), NULL))",
        'teacherCount',
      )
      .where('instance.schoolYearId = :schoolYearId', { schoolYearId })
      .andWhere('instance.gradeLevel BETWEEN :minGrade AND :maxGrade', {
        minGrade: gradeRange.min,
        maxGrade: gradeRange.max,
      })
      .groupBy('instance.gradeLevel')
      .addGroupBy('subject.subjectCode')
      .addGroupBy('subject.name')
      .addGroupBy('instance.weeklyHours')
      .getRawMany();

    const shortages = rows
      .map((row) => {
        const sections = Number(row.sections ?? 0);
        const weeklyHours = Number(row.weeklyHours ?? 0);
        const teacherCount = Number(row.teacherCount ?? 0);
        const required = Math.ceil(
          (sections * weeklyHours) / Number(teacherCap),
        );
        return {
          gradeLevel: Number(row.gradeLevel),
          subjectCode: row.subjectCode as string,
          subjectName: row.subjectName as string,
          sections,
          weeklyHours,
          teacherCount,
          required,
          shortage: Math.max(0, required - teacherCount),
        };
      })
      .filter((row) => row.shortage > 0);

    if (shortages.length > 0) {
      throw new BadRequestException({
        message: 'insufficientTeacherCapacity',
        shortages,
      });
    }
  }

  async apply(
    criteria: GenerateTimetableDto,
    user?: SanitizedUser,
  ): Promise<GenerationApplyResultDto> {
    const preview = await this.preview(criteria);
    const persisted: ProposedAssignmentDto[] = [];
    const failedToPersist: UnassignedSessionDto[] = [];

    for (const assignment of preview.assignments) {
      try {
        await this.assignmentsService.create(
          {
            courseId: assignment.courseId,
            slotId: assignment.slotId,
            teacherId: assignment.teacherId,
            classGroupId: assignment.classGroupId,
          },
          user,
        );
        persisted.push(assignment);
      } catch (err) {
        failedToPersist.push({
          courseId: assignment.courseId,
          classGroupId: assignment.classGroupId,
          teacherId: assignment.teacherId,
          blockLength: 1,
          reason: err instanceof Error ? err.message : 'PERSISTENCE_FAILED',
        });
      }
    }

    return {
      ...preview,
      persistedAssignments: persisted,
      failedToPersist,
    };
  }

  private async loadCourses(
    schoolYearId: number,
    range: GradeRange,
  ): Promise<Courses[]> {
    return this.coursesRepository.find({
      relations: {
        courseInstance: true,
        classGroup: true,
      },
      where: {
        courseInstance: {
          schoolYearId: schoolYearId.toString(),
          gradeLevel: Between(range.min, range.max),
        },
      },
    });
  }

  private async loadSlots(
    division: ScheduleDivision,
  ): Promise<TimetableSlot[]> {
    return this.slotRepository.find({
      where: { division },
      order: {
        dayOfWeek: 'ASC',
        startTime: 'ASC',
      },
    });
  }

  private async loadAssignments(
    schoolYearId: number,
    range: GradeRange,
  ): Promise<TimetableAssignments[]> {
    return this.assignmentsRepository.find({
      relations: {
        course: {
          courseInstance: true,
        },
      },
      where: {
        course: {
          courseInstance: {
            schoolYearId: schoolYearId.toString(),
            gradeLevel: Between(range.min, range.max),
          },
        },
      },
    });
  }

  private resolveDivisionRange(division: ScheduleDivision): GradeRange {
    switch (division) {
      case 'elementary':
        return { min: 1, max: 5 };
      case 'secondary':
        return { min: 6, max: 9 };
      case 'senior':
        return { min: 10, max: 11 };
      default:
        return { min: 1, max: 11 };
    }
  }

  private buildPlan({
    courses,
    slots,
    existingAssignments,
    criteria,
  }: {
    courses: Courses[];
    slots: TimetableSlot[];
    existingAssignments: TimetableAssignments[];
    criteria: GenerateTimetableDto;
  }): GenerationPreviewDto {
    const teacherConstraints = new Map<string, TeacherConstraintDto>();
    criteria.teacherConstraints?.forEach((constraint) => {
      teacherConstraints.set(constraint.teacherId, constraint);
    });

    const coursePreferences = new Map<number, CoursePreferenceDto>();
    criteria.coursePreferences?.forEach((pref) => {
      coursePreferences.set(pref.courseId, pref);
    });

    const slotMeta = this.decorateSlots(slots);
    const slotLookup = new Map<number, SlotWithMeta>();
    slotMeta.forEach((slot) => slotLookup.set(slot.slotId, slot));
    const slotsByDay = this.groupSlotsByDay(slotMeta);

    const teacherHours = new Map<string, number>();
    const teacherSlotUsage = new Map<string, Set<number>>();
    const classGroupSlotUsage = new Map<number, Set<number>>();

    const ensureSet = <T>(
      collection: Map<T, Set<number>>,
      key: T,
    ): Set<number> => {
      const existing = collection.get(key);
      if (existing) {
        return existing;
      }
      const created = new Set<number>();
      collection.set(key, created);
      return created;
    };

    for (const existing of existingAssignments) {
      if (!existing.slotId) {
        continue;
      }
      const slotId = Number(existing.slotId);
      if (existing.teacherId) {
        ensureSet(teacherSlotUsage, existing.teacherId).add(slotId);
        teacherHours.set(
          existing.teacherId,
          (teacherHours.get(existing.teacherId) ?? 0) + 1,
        );
      }
      if (existing.classGroupId) {
        const cg = Number(existing.classGroupId);
        ensureSet(classGroupSlotUsage, cg).add(slotId);
      }
    }

    const demands: SessionDemand[] = [];
    const unassigned: UnassignedSessionDto[] = [];

    for (const course of courses) {
      const classGroupId = Number(course.classGroupId);
      const teacherId = course.teacherId;
      const courseId = Number(course.courseId);

      if (!classGroupId || !teacherId) {
        unassigned.push({
          courseId,
          classGroupId: classGroupId || 0,
          teacherId: teacherId ?? 'unknown',
          blockLength: 1,
          reason: 'COURSE_INCOMPLETE',
        });
        continue;
      }

      const pref = coursePreferences.get(courseId);
      const blockLength = pref?.blockLength ?? 1;
      const weeklyHours = pref?.sessionsPerWeek ?? course.courseInstance?.weeklyHours ?? 1;
      const totalBlocks = Math.max(
        1,
        Math.ceil(weeklyHours / blockLength),
      );
      const preferredShift = pref?.preferredShift ?? 'any';
      const label = `${course.courseInstance?.courseName ?? 'Course'} - ${
        course.classGroup?.gradeLevel ?? ''
      }${course.classGroup?.section ?? ''}`.trim();

      for (let i = 0; i < totalBlocks; i += 1) {
        demands.push({
          courseId,
          classGroupId,
          teacherId,
          blockLength,
          preferredShift,
          label,
        });
      }
    }

    demands.sort((a, b) => {
      if (b.blockLength !== a.blockLength) {
        return b.blockLength - a.blockLength;
      }
      const aTeacherPref =
        teacherConstraints.get(a.teacherId)?.preferredShift ?? 'any';
      const bTeacherPref =
        teacherConstraints.get(b.teacherId)?.preferredShift ?? 'any';
      const prefScore = (value: TimetableShiftPreference): number =>
        value === 'any' ? 0 : 1;
      return prefScore(bTeacherPref) - prefScore(aTeacherPref);
    });

    const proposed: ProposedAssignmentDto[] = [];

    for (const demand of demands) {
      const resolution = this.placeDemand({
        demand,
        criteria,
        teacherConstraints,
        slotsByDay,
        teacherHours,
        teacherSlotUsage,
        classGroupSlotUsage,
        slotLookup,
      });

      if (!resolution) {
        unassigned.push({
          courseId: demand.courseId,
          classGroupId: demand.classGroupId,
          teacherId: demand.teacherId,
          blockLength: demand.blockLength,
          reason: 'NO_SLOT_AVAILABLE',
        });
        continue;
      }

      for (const slot of resolution) {
        proposed.push({
          courseId: demand.courseId,
          classGroupId: demand.classGroupId,
          teacherId: demand.teacherId,
          slotId: slot.slotId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          shift: slot.shift,
          label: demand.label,
        });

        teacherHours.set(
          demand.teacherId,
          (teacherHours.get(demand.teacherId) ?? 0) + 1,
        );
        const teacherSlotSet =
          teacherSlotUsage.get(demand.teacherId) ?? new Set();
        teacherSlotSet.add(slot.slotId);
        teacherSlotUsage.set(demand.teacherId, teacherSlotSet);

        const classGroupSet =
          classGroupSlotUsage.get(demand.classGroupId) ?? new Set();
        classGroupSet.add(slot.slotId);
        classGroupSlotUsage.set(demand.classGroupId, classGroupSet);
      }
    }

    return {
      assignments: proposed,
      unassignedSessions: unassigned,
    };
  }

  private decorateSlots(slots: TimetableSlot[]): SlotWithMeta[] {
    const slotsByDay = this.groupSlotsByDayRaw(slots);
    const dayMaxEnd = new Map<number, number>();
    slotsByDay.forEach((daySlots, day) => {
      let maxEnd = 0;
      daySlots.forEach((slot) => {
        const endSeconds = this.toSeconds(slot.endTime);
        if (endSeconds > maxEnd) {
          maxEnd = endSeconds;
        }
      });
      dayMaxEnd.set(day, maxEnd);
    });

    return slots.map((slot) => {
      const startSeconds = this.toSeconds(slot.startTime);
      const endSeconds = this.toSeconds(slot.endTime);
      const shift: Exclude<TimetableShiftPreference, 'any'> =
        startSeconds < 12 * 3600 ? 'morning' : 'afternoon';
      const maxEnd = dayMaxEnd.get(slot.dayOfWeek) ?? endSeconds;
      return {
        ...slot,
        shift,
        startSeconds,
        endSeconds,
        isLastOfDay: endSeconds === maxEnd,
      };
    });
  }

  private groupSlotsByDayRaw(slots: TimetableSlot[]): Map<number, TimetableSlot[]> {
    const map = new Map<number, TimetableSlot[]>();
    slots.forEach((slot) => {
      const list = map.get(slot.dayOfWeek) ?? [];
      list.push(slot);
      map.set(slot.dayOfWeek, list);
    });
    map.forEach((list) =>
      list.sort((a, b) => this.toSeconds(a.startTime) - this.toSeconds(b.startTime)),
    );
    return map;
  }

  private groupSlotsByDay(slots: SlotWithMeta[]): Map<number, SlotWithMeta[]> {
    const map = new Map<number, SlotWithMeta[]>();
    slots.forEach((slot) => {
      const list = map.get(slot.dayOfWeek) ?? [];
      list.push(slot);
      map.set(slot.dayOfWeek, list);
    });
    map.forEach((list) =>
      list.sort((a, b) => a.startSeconds - b.startSeconds),
    );
    return map;
  }

  private placeDemand({
    demand,
    criteria,
    teacherConstraints,
    slotsByDay,
    teacherHours,
    teacherSlotUsage,
    classGroupSlotUsage,
    slotLookup,
  }: {
    demand: SessionDemand;
    criteria: GenerateTimetableDto;
    teacherConstraints: Map<string, TeacherConstraintDto>;
    slotsByDay: Map<number, SlotWithMeta[]>;
    teacherHours: Map<string, number>;
    teacherSlotUsage: Map<string, Set<number>>;
    classGroupSlotUsage: Map<number, Set<number>>;
    slotLookup: Map<number, SlotWithMeta>;
  }): SlotWithMeta[] | undefined {
    const teacherConstraint = teacherConstraints.get(demand.teacherId);
    const teacherCap = criteria.teacherWeeklyHourCap;
    const usedHours = teacherHours.get(demand.teacherId) ?? 0;
    if (usedHours + demand.blockLength > teacherCap) {
      return undefined;
    }

    const preferredShift =
      demand.preferredShift !== 'any'
        ? demand.preferredShift
        : teacherConstraint?.preferredShift ?? 'any';

    const teacherSlots = teacherSlotUsage.get(demand.teacherId) ?? new Set();
    const classGroupSlots =
      classGroupSlotUsage.get(demand.classGroupId) ?? new Set();

    for (const [, daySlots] of slotsByDay) {
      if (daySlots.length === 0) {
        continue;
      }

      for (let i = 0; i <= daySlots.length - demand.blockLength; i += 1) {
        const block = daySlots.slice(i, i + demand.blockLength);

        if (
          preferredShift !== 'any' &&
          block.some((slot) => slot.shift !== preferredShift)
        ) {
          continue;
        }

        if (
          teacherConstraint?.avoidLastSlot &&
          block.some((slot) => slot.isLastOfDay)
        ) {
          continue;
        }

        const overlapsWithTeacher = block.some((slot) =>
          teacherSlots.has(slot.slotId),
        );
        if (overlapsWithTeacher) {
          continue;
        }

        const overlapsWithClassGroup = block.some((slot) =>
          classGroupSlots.has(slot.slotId),
        );
        if (overlapsWithClassGroup) {
          continue;
        }

        return block.map((slot) => slotLookup.get(slot.slotId)!);
      }
    }

    return undefined;
  }

  private toSeconds(value: string): number {
    const [hours, minutes, seconds] = value.split(':').map(Number);
    return hours * 3600 + minutes * 60 + (seconds ?? 0);
  }
}
