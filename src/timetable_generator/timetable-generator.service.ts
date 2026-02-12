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
  slotIndex: number;
};

type SessionDemand = {
  courseId: number;
  classGroupId: number;
  teacherId: string;
  blockLength: number;
  preferredShift: TimetableShiftPreference;
  label: string;
  maxSessionsPerDay?: number;
  minGapSlots?: number;
  allowDoubleBlock?: boolean;
  targetDays?: number[];
  targetDay?: number;
};

type GradeRange = {
  min: number;
  max: number;
};

type BlockedSlotRange = {
  dayOfWeek: number;
  startSeconds: number;
  endSeconds: number;
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
    const blockedSlotsByDay = this.buildBlockedSlotMap(criteria.blockedSlots ?? []);

    const teacherHours = new Map<string, number>();
    const teacherSlotUsage = new Map<string, Set<number>>();
    const classGroupSlotUsage = new Map<number, Set<number>>();
    const subjectDayCount = new Map<number, Map<number, number>>();
    const classGroupDayLoad = new Map<number, Map<number, number>>();
    const plannedClassGroupDayLoad = new Map<number, Map<number, number>>();
    const lastSubjectByClassGroupDay = new Map<
      number,
      Map<number, Map<number, number>>
    >();
    const lastSubjectSlotIndex = new Map<
      number,
      Map<number, Map<number, number>>
    >();

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

    const ensureDayMap = <T>(
      collection: Map<T, Map<number, number>>,
      key: T,
    ): Map<number, number> => {
      const existing = collection.get(key);
      if (existing) {
        return existing;
      }
      const created = new Map<number, number>();
      collection.set(key, created);
      return created;
    };

    const incrementDayCount = <T>(
      collection: Map<T, Map<number, number>>,
      key: T,
      day: number,
      delta = 1,
    ): void => {
      const map = ensureDayMap(collection, key);
      map.set(day, (map.get(day) ?? 0) + delta);
    };

    const ensureSlotMap = (
      classGroupId: number,
      day: number,
    ): Map<number, number> => {
      const dayMap =
        lastSubjectByClassGroupDay.get(classGroupId) ?? new Map();
      lastSubjectByClassGroupDay.set(classGroupId, dayMap);
      const slotMap = dayMap.get(day) ?? new Map<number, number>();
      dayMap.set(day, slotMap);
      return slotMap;
    };

    const ensureCourseSlotMap = (
      classGroupId: number,
      day: number,
    ): Map<number, number> => {
      const dayMap = lastSubjectSlotIndex.get(classGroupId) ?? new Map();
      lastSubjectSlotIndex.set(classGroupId, dayMap);
      const courseMap = dayMap.get(day) ?? new Map<number, number>();
      dayMap.set(day, courseMap);
      return courseMap;
    };

    for (const existing of existingAssignments) {
      if (!existing.slotId) {
        continue;
      }
      const slotId = Number(existing.slotId);
      const slot = slotLookup.get(slotId);
      if (!slot) {
        continue;
      }
      const day = slot.dayOfWeek;
      const slotIndex = slot.slotIndex;
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
        incrementDayCount(classGroupDayLoad, cg, day, 1);
        incrementDayCount(plannedClassGroupDayLoad, cg, day, 1);
        const slotMap = ensureSlotMap(cg, day);
        slotMap.set(slotIndex, Number(existing.courseId));
        const courseSlotMap = ensureCourseSlotMap(cg, day);
        courseSlotMap.set(Number(existing.courseId), slotIndex);
      }
      if (existing.courseId) {
        incrementDayCount(subjectDayCount, Number(existing.courseId), day, 1);
      }
    }

    const demands: SessionDemand[] = [];
    const unassigned: UnassignedSessionDto[] = [];
    const availableDays = Array.from(slotsByDay.keys()).sort((a, b) => a - b);

    const assignTargetDays = ({
      classGroupId,
      totalBlocks,
      preferredDays,
    }: {
      classGroupId: number;
      totalBlocks: number;
      preferredDays?: number[];
    }): number[] => {
      const balanceAcrossDays = criteria.balanceAcrossDays === true;
      const hasPreferredDays = Boolean(preferredDays?.length);
      if (!balanceAcrossDays && !hasPreferredDays) {
        return [];
      }

      const candidateDays = (preferredDays?.length
        ? preferredDays
        : availableDays
      ).filter((day) => availableDays.includes(day));

      if (candidateDays.length === 0 || totalBlocks <= 0) {
        return [];
      }

      const plannedDayLoad =
        plannedClassGroupDayLoad.get(classGroupId) ?? new Map<number, number>();
      plannedClassGroupDayLoad.set(classGroupId, plannedDayLoad);

      const getLoad = (day: number): number => plannedDayLoad.get(day) ?? 0;
      const incrementLoad = (day: number): void => {
        plannedDayLoad.set(day, getLoad(day) + 1);
      };

      const pickDay = (exclude?: Set<number>): number | undefined => {
        let bestDay: number | undefined;
        let bestLoad = Number.POSITIVE_INFINITY;
        for (const day of candidateDays) {
          if (exclude?.has(day)) {
            continue;
          }
          const load = getLoad(day);
          if (load < bestLoad) {
            bestLoad = load;
            bestDay = day;
          }
        }
        return bestDay;
      };

      const targetDays: number[] = [];
      const distinctCount = Math.min(totalBlocks, candidateDays.length);
      const used = new Set<number>();

      for (let i = 0; i < distinctCount; i += 1) {
        const day = pickDay(used);
        if (day === undefined) {
          break;
        }
        used.add(day);
        targetDays.push(day);
        incrementLoad(day);
      }

      while (targetDays.length < totalBlocks) {
        const day = pickDay();
        if (day === undefined) {
          break;
        }
        targetDays.push(day);
        incrementLoad(day);
      }

      return targetDays;
    };

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
      const maxSessionsPerDay = pref?.maxSessionsPerDay;
      const minGapSlots = pref?.minGapSlots;
      const allowDoubleBlock = pref?.allowDoubleBlock;
      const targetDaysOverride = pref?.targetDays?.filter((day) =>
        availableDays.includes(day),
      );
      const label = `${course.courseInstance?.courseName ?? 'Course'} - ${
        course.classGroup?.gradeLevel ?? ''
      }${course.classGroup?.section ?? ''}`.trim();

      const targetDaysForSessions = assignTargetDays({
        classGroupId,
        totalBlocks,
        preferredDays: targetDaysOverride,
      });

      for (let i = 0; i < totalBlocks; i += 1) {
        demands.push({
          courseId,
          classGroupId,
          teacherId,
          blockLength,
          preferredShift,
          label,
          maxSessionsPerDay,
          minGapSlots,
          allowDoubleBlock,
          targetDays: targetDaysOverride,
          targetDay: targetDaysForSessions[i],
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
        subjectDayCount,
        classGroupDayLoad,
        lastSubjectByClassGroupDay,
        lastSubjectSlotIndex,
        blockedSlotsByDay,
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

      const dayOfWeek = resolution[0]?.dayOfWeek ?? 0;

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

        const slotMap = ensureSlotMap(demand.classGroupId, slot.dayOfWeek);
        slotMap.set(slot.slotIndex, demand.courseId);
      }

      if (dayOfWeek) {
        incrementDayCount(subjectDayCount, demand.courseId, dayOfWeek, 1);
        incrementDayCount(
          classGroupDayLoad,
          demand.classGroupId,
          dayOfWeek,
          demand.blockLength,
        );
        const courseSlotMap = ensureCourseSlotMap(
          demand.classGroupId,
          dayOfWeek,
        );
        const lastSlotIndex =
          resolution[resolution.length - 1]?.slotIndex ?? 0;
        courseSlotMap.set(demand.courseId, lastSlotIndex);
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
        slotIndex: 0,
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
    map.forEach((list) => {
      list.sort((a, b) => a.startSeconds - b.startSeconds);
      list.forEach((slot, index) => {
        slot.slotIndex = index;
      });
    });
    return map;
  }

  private buildBlockedSlotMap(
    blockedSlots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
  ): Map<number, BlockedSlotRange[]> {
    const map = new Map<number, BlockedSlotRange[]>();
    blockedSlots.forEach((blocked) => {
      const startSeconds = this.toSeconds(blocked.startTime);
      const endSeconds = this.toSeconds(blocked.endTime);
      if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds)) {
        return;
      }
      if (endSeconds <= startSeconds) {
        return;
      }
      const list = map.get(blocked.dayOfWeek) ?? [];
      list.push({
        dayOfWeek: blocked.dayOfWeek,
        startSeconds,
        endSeconds,
      });
      map.set(blocked.dayOfWeek, list);
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
    subjectDayCount,
    classGroupDayLoad,
    lastSubjectByClassGroupDay,
    lastSubjectSlotIndex,
    blockedSlotsByDay,
  }: {
    demand: SessionDemand;
    criteria: GenerateTimetableDto;
    teacherConstraints: Map<string, TeacherConstraintDto>;
    slotsByDay: Map<number, SlotWithMeta[]>;
    teacherHours: Map<string, number>;
    teacherSlotUsage: Map<string, Set<number>>;
    classGroupSlotUsage: Map<number, Set<number>>;
    subjectDayCount: Map<number, Map<number, number>>;
    classGroupDayLoad: Map<number, Map<number, number>>;
    lastSubjectByClassGroupDay: Map<number, Map<number, Map<number, number>>>;
    lastSubjectSlotIndex: Map<number, Map<number, Map<number, number>>>;
    blockedSlotsByDay: Map<number, BlockedSlotRange[]>;
  }): SlotWithMeta[] | undefined {
    const teacherConstraint = teacherConstraints.get(demand.teacherId);
    const teacherCap = criteria.teacherWeeklyHourCap;
    const usedHours = teacherHours.get(demand.teacherId) ?? 0;
    if (teacherCap && usedHours + demand.blockLength > teacherCap) {
      return undefined;
    }

    const preferredShift =
      demand.preferredShift !== 'any'
        ? demand.preferredShift
        : teacherConstraint?.preferredShift ?? 'any';

    const teacherSlots = teacherSlotUsage.get(demand.teacherId) ?? new Set();
    const classGroupSlots =
      classGroupSlotUsage.get(demand.classGroupId) ?? new Set();

    const subjectDayMap = subjectDayCount.get(demand.courseId) ?? new Map();
    const classGroupDayMap =
      classGroupDayLoad.get(demand.classGroupId) ?? new Map();
    const classGroupAssignmentsByDay =
      lastSubjectByClassGroupDay.get(demand.classGroupId);
    const courseSlotIndexByDay =
      lastSubjectSlotIndex.get(demand.classGroupId);

    const maxSessionsPerDay =
      demand.maxSessionsPerDay ?? criteria.maxSessionsPerDayDefault;
    const minGapSlots = demand.minGapSlots ?? criteria.minGapSlotsDefault;
    const allowDoubleBlock = demand.allowDoubleBlock === true;
    const avoidConsecutive =
      criteria.avoidConsecutiveSameSubject === true && !allowDoubleBlock;
    const balanceAcrossDays = criteria.balanceAcrossDays === true;
    const targetDay = demand.targetDay;
    const allowedTargetDays = demand.targetDays?.length
      ? new Set(demand.targetDays)
      : undefined;

    const totalLoad = Array.from(classGroupDayMap.values()).reduce(
      (sum, value) => sum + value,
      0,
    );
    const dayCount = Math.max(slotsByDay.size, 1);
    const averageLoad = totalLoad / dayCount;

    const days = Array.from(slotsByDay.keys()).sort((a, b) => a - b);

    let best:
      | {
          block: SlotWithMeta[];
          score: number;
          day: number;
          startIndex: number;
        }
      | undefined;

    const hasBlockedOverlap = (
      block: SlotWithMeta[],
      ranges: BlockedSlotRange[],
    ): boolean => {
      if (ranges.length === 0) {
        return false;
      }
      return block.some((slot) =>
        ranges.some(
          (range) =>
            slot.startSeconds < range.endSeconds &&
            slot.endSeconds > range.startSeconds,
        ),
      );
    };

    for (const day of days) {
      const daySlots = slotsByDay.get(day);
      if (!daySlots || daySlots.length === 0) {
        continue;
      }

      if (allowedTargetDays && !allowedTargetDays.has(day)) {
        continue;
      }

      if (maxSessionsPerDay && (subjectDayMap.get(day) ?? 0) >= maxSessionsPerDay) {
        continue;
      }

      const blockedRanges = blockedSlotsByDay.get(day) ?? [];
      const dayAssignments = classGroupAssignmentsByDay?.get(day);
      const lastSlotIndexForCourse = courseSlotIndexByDay
        ?.get(day)
        ?.get(demand.courseId);

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

        if (blockedRanges.length && hasBlockedOverlap(block, blockedRanges)) {
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

        const startIndex = block[0]?.slotIndex ?? 0;
        const endIndex = block[block.length - 1]?.slotIndex ?? startIndex;

        let score = 0;

        if (targetDay !== undefined && day !== targetDay) {
          score += 50;
        }

        if (balanceAcrossDays) {
          if ((subjectDayMap.get(day) ?? 0) > 0) {
            score += 20;
          }
          const dayLoad = classGroupDayMap.get(day) ?? 0;
          const dayLoadAfter = dayLoad + demand.blockLength;
          const excess = Math.max(0, dayLoadAfter - averageLoad);
          if (excess > 0) {
            score += Math.ceil(excess) * 5;
          }
        }

        if (!allowDoubleBlock) {
          if (avoidConsecutive) {
            const hasAdjacentSameSubject =
              dayAssignments?.get(startIndex - 1) === demand.courseId ||
              dayAssignments?.get(endIndex + 1) === demand.courseId;
            if (hasAdjacentSameSubject) {
              score += 15;
            }
          }

          if (minGapSlots !== undefined && minGapSlots > 0) {
            let violatesMinGap = false;
            for (let offset = 1; offset <= minGapSlots; offset += 1) {
              if (
                dayAssignments?.get(startIndex - offset) === demand.courseId ||
                dayAssignments?.get(endIndex + offset) === demand.courseId
              ) {
                violatesMinGap = true;
                break;
              }
            }

            if (
              !violatesMinGap &&
              lastSlotIndexForCourse !== undefined &&
              Math.abs(startIndex - lastSlotIndexForCourse) - 1 < minGapSlots
            ) {
              violatesMinGap = true;
            }

            if (violatesMinGap) {
              score += 10;
            }
          }
        }

        if (
          !best ||
          score < best.score ||
          (score === best.score &&
            (day < best.day ||
              (day === best.day && startIndex < best.startIndex)))
        ) {
          best = {
            block,
            score,
            day,
            startIndex,
          };
        }
      }
    }

    return best?.block;
  }

  private toSeconds(value: string): number {
    const [hours, minutes, seconds] = value.split(':').map(Number);
    return hours * 3600 + minutes * 60 + (seconds ?? 0);
  }
}
