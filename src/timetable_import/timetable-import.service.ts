import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource, IsNull } from 'typeorm';
import { ClassGroups } from '../class_groups/class_groups.entity';
import { CourseInstances } from '../course_instances/course_instances.entity';
import { Courses } from '../courses/courses.entity';
import { Curricula } from '../curricula/curricula.entity';
import { CurriculumItems } from '../curriculum_items/curriculum_items.entity';
import { SchoolYears } from '../school_years/school_years.entity';
import { SubjectAreas } from '../subject_areas/subject_areas.entity';
import { Subjects } from '../subjects/subjects.entity';
import { TimetableAssignments } from '../timetable_assignments/timetable_assignments.entity';
import { TimetableSlot } from '../timetable_slots/timetable_slots.entity';
import { Users } from '../users/users.entity';
import type {
  ScannedTimetableAssignment,
  ScannedTimetableResponse,
} from '../scanner/timetable-scanner.types';

type ConfirmTimetableImportPayload = {
  schoolYearId?: unknown;
  scan?: unknown;
};

type ImportCountKey =
  | 'teachers'
  | 'subjectAreas'
  | 'subjects'
  | 'classGroups'
  | 'curricula'
  | 'curriculumItems'
  | 'courseInstances'
  | 'courses'
  | 'slots'
  | 'assignments';

type ImportCounts = Record<ImportCountKey, number>;

const DEFAULT_TEACHER_PASSWORD = 'SchoolMan#2026';
const SPECIALIZATION_GRADES = new Set([10, 11]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toPositiveNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();

const makeCode = (value: string, prefix: string, maxLength = 50): string => {
  const body = normalizeText(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 6))
    .join('-')
    .toUpperCase();
  return `${prefix}-${body || 'ITEM'}`.slice(0, maxLength);
};

const getDivisionForGrade = (gradeLevel: number): 'elementary' | 'secondary' | 'senior' => {
  if (gradeLevel <= 5) {
    return 'elementary';
  }
  if (gradeLevel <= 9) {
    return 'secondary';
  }
  return 'senior';
};

const getSpecializationTrack = (
  assignment: ScannedTimetableAssignment,
): string | null => {
  if (!SPECIALIZATION_GRADES.has(assignment.gradeLevel)) {
    return null;
  }
  return assignment.section.padStart(2, '0');
};

@Injectable()
export class TimetableImportService {
  constructor(private readonly dataSource: DataSource) {}

  async confirmImport(payload: unknown) {
    if (!isRecord(payload)) {
      throw new BadRequestException('Invalid timetable import payload.');
    }

    const { schoolYearId, scan } = payload as ConfirmTimetableImportPayload;
    const parsedSchoolYearId = toPositiveNumber(schoolYearId);
    if (!parsedSchoolYearId) {
      throw new BadRequestException('schoolYearId is required.');
    }
    if (!isRecord(scan) || !Array.isArray(scan.assignments)) {
      throw new BadRequestException('A scanned timetable payload is required.');
    }

    const assignments = (scan as ScannedTimetableResponse).assignments.filter(
      (assignment) =>
        assignment.teacherId &&
        assignment.teacherName &&
        assignment.subjectName &&
        assignment.groupCode &&
        assignment.gradeLevel > 0 &&
        assignment.section &&
        assignment.dayOfWeek > 0 &&
        assignment.period > 0 &&
        assignment.startTime &&
        assignment.endTime,
    );

    if (assignments.length === 0) {
      throw new BadRequestException('No valid timetable assignments were provided.');
    }

    const passwordHash = await bcrypt.hash(DEFAULT_TEACHER_PASSWORD, 10);
    const counts = this.emptyCounts();
    const skippedAssignments: ScannedTimetableAssignment[] = [];

    await this.dataSource.transaction(async (manager) => {
      const schoolYear = await manager.findOne(SchoolYears, {
        where: { schoolYearId: String(parsedSchoolYearId) },
      });
      if (!schoolYear) {
        throw new NotFoundException('School year not found.');
      }

      const area = await this.getOrCreateSubjectArea(manager, counts);
      const subjectByCode = new Map<string, Subjects>();
      const groupByCode = new Map<string, ClassGroups>();
      const specializationAreaByTrack = new Map<string, SubjectAreas>();
      const curriculumByKey = new Map<string, Curricula>();
      const curriculumItemByKey = new Map<string, CurriculumItems>();
      const courseInstanceByKey = new Map<string, CourseInstances>();
      const courseByKey = new Map<string, Courses>();
      const slotByKey = new Map<string, TimetableSlot>();

      for (const assignment of assignments) {
        const teacher = await this.getOrCreateTeacher(manager, assignment, passwordHash, counts);
        const subject = await this.getOrCreateSubject(manager, assignment, area, subjectByCode, counts);
        const group = await this.getOrCreateClassGroup(
          manager,
          parsedSchoolYearId,
          assignment,
          groupByCode,
          counts,
        );
        const curriculum = await this.getOrCreateCurriculum(
          manager,
          assignment,
          specializationAreaByTrack,
          curriculumByKey,
          counts,
        );
        const curriculumItem = await this.getOrCreateCurriculumItem(
          manager,
          curriculum,
          subject,
          assignments,
          curriculumItemByKey,
          counts,
        );
        const courseInstance = await this.getOrCreateCourseInstance(
          manager,
          parsedSchoolYearId,
          assignment,
          subject,
          curriculumItem,
          group,
          courseInstanceByKey,
          counts,
        );
        const course = await this.getOrCreateCourse(
          manager,
          courseInstance,
          group,
          teacher,
          courseByKey,
          counts,
        );
        const slot = await this.getOrCreateSlot(manager, assignment, slotByKey, counts);

        const inserted = await this.tryCreateAssignment(manager, course, group, teacher, slot);
        if (inserted) {
          counts.assignments += 1;
        } else {
          skippedAssignments.push(assignment);
        }
      }
    });

    return {
      imported: counts,
      skippedAssignments: skippedAssignments.length,
      defaultTeacherPassword: DEFAULT_TEACHER_PASSWORD,
      message: `Imported ${counts.assignments} timetable assignments. Skipped ${skippedAssignments.length} conflicting assignments.`,
    };
  }

  private emptyCounts(): ImportCounts {
    return {
      teachers: 0,
      subjectAreas: 0,
      subjects: 0,
      classGroups: 0,
      curricula: 0,
      curriculumItems: 0,
      courseInstances: 0,
      courses: 0,
      slots: 0,
      assignments: 0,
    };
  }

  private async getOrCreateSubjectArea(manager: any, counts: ImportCounts): Promise<SubjectAreas> {
    const repo = manager.getRepository(SubjectAreas);
    let area = await repo.findOne({ where: { code: 'PDF-HORARIO' } });
    if (!area) {
      area = repo.create({
        code: 'PDF-HORARIO',
        name: 'Horario importado',
        isSpecialization: false,
      });
      area = await repo.save(area);
      counts.subjectAreas += 1;
    }
    return area;
  }

  private async getOrCreateTeacher(
    manager: any,
    assignment: ScannedTimetableAssignment,
    passwordHash: string,
    counts: ImportCounts,
  ): Promise<Users> {
    const repo = manager.getRepository(Users);
    let teacher = await repo.findOne({ where: { nationalId: assignment.teacherId } });
    if (!teacher) {
      teacher = repo.create({
        nationalId: assignment.teacherId,
        username: `teacher.${assignment.teacherId}`,
        passwordHash,
        role: 'teacher',
        firstName: assignment.teacherName,
        lastName: null,
        email: null,
        phone: null,
        isActive: true,
        mustChangePassword: true,
        tempPasswordIssuedAt: new Date(),
      });
      teacher = await repo.save(teacher);
      counts.teachers += 1;
    }
    return teacher;
  }

  private async getOrCreateSubject(
    manager: any,
    assignment: ScannedTimetableAssignment,
    area: SubjectAreas,
    cache: Map<string, Subjects>,
    counts: ImportCounts,
  ): Promise<Subjects> {
    const key = assignment.subjectCode;
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    const repo = manager.getRepository(Subjects);
    let subject = await repo.findOne({ where: { subjectCode: key } });
    if (!subject) {
      subject = repo.create({
        subjectCode: key,
        name: assignment.subjectName,
        description: 'Imported from teacher timetable PDF.',
        areaId: area.areaId,
      });
      subject = await repo.save(subject);
      counts.subjects += 1;
    }
    cache.set(key, subject);
    return subject;
  }

  private async getOrCreateClassGroup(
    manager: any,
    schoolYearId: number,
    assignment: ScannedTimetableAssignment,
    cache: Map<string, ClassGroups>,
    counts: ImportCounts,
  ): Promise<ClassGroups> {
    const key = `${schoolYearId}:${assignment.groupCode}`;
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    const repo = manager.getRepository(ClassGroups);
    let group = await repo.findOne({
      where: {
        schoolYearId: String(schoolYearId),
        gradeLevel: assignment.gradeLevel,
        section: assignment.section,
      },
    });
    if (!group) {
      group = repo.create({
        schoolYearId: String(schoolYearId),
        gradeLevel: assignment.gradeLevel,
        section: assignment.section,
      });
      group = await repo.save(group);
      counts.classGroups += 1;
    }
    cache.set(key, group);
    return group;
  }

  private async getOrCreateCurriculum(
    manager: any,
    assignment: ScannedTimetableAssignment,
    specializationAreaCache: Map<string, SubjectAreas>,
    cache: Map<string, Curricula>,
    counts: ImportCounts,
  ): Promise<Curricula> {
    const trackName = getSpecializationTrack(assignment);
    const key = trackName
      ? `${assignment.gradeLevel}:${trackName}`
      : `${assignment.gradeLevel}:base`;
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    const repo = manager.getRepository(Curricula);
    const specializationArea = trackName
      ? await this.getOrCreateSpecializationArea(
          manager,
          trackName,
          specializationAreaCache,
          counts,
        )
      : null;

    let curriculum = await repo.findOne({
      where: trackName
        ? {
            gradeLevel: assignment.gradeLevel,
            trackName,
          }
        : {
            gradeLevel: assignment.gradeLevel,
            trackName: IsNull(),
            specializationAreaId: IsNull(),
          },
    });
    if (!curriculum) {
      curriculum = repo.create({
        gradeLevel: assignment.gradeLevel,
        name: trackName
          ? `${trackName} grado ${assignment.gradeLevel}`
          : `Currículo importado grado ${assignment.gradeLevel}`,
        trackName,
        specializationAreaId: specializationArea?.areaId ?? null,
        isActive: true,
      });
      curriculum = await repo.save(curriculum);
      counts.curricula += 1;
    } else if (
      trackName &&
      specializationArea &&
      curriculum.specializationAreaId !== specializationArea.areaId
    ) {
      await repo.update(
        { curriculumId: curriculum.curriculumId },
        { specializationAreaId: specializationArea.areaId },
      );
      curriculum.specializationAreaId = specializationArea.areaId;
    }
    cache.set(key, curriculum);
    return curriculum;
  }

  private async getOrCreateSpecializationArea(
    manager: any,
    trackName: string,
    cache: Map<string, SubjectAreas>,
    counts: ImportCounts,
  ): Promise<SubjectAreas> {
    const cached = cache.get(trackName);
    if (cached) {
      return cached;
    }

    const repo = manager.getRepository(SubjectAreas);
    const code = `SPEC-${trackName}`;
    let area = await repo.findOne({ where: { code } });
    if (!area) {
      area = await repo.findOne({ where: { name: trackName } });
    }
    if (!area) {
      area = repo.create({
        code,
        name: trackName,
        isSpecialization: true,
      });
      area = await repo.save(area);
      counts.subjectAreas += 1;
    } else if (!area.isSpecialization || area.code !== code) {
      await repo.update(
        { areaId: area.areaId },
        { isSpecialization: true, code: area.code ?? code },
      );
      area.isSpecialization = true;
      area.code = area.code ?? code;
    }
    cache.set(trackName, area);
    return area;
  }

  private async getOrCreateCurriculumItem(
    manager: any,
    curriculum: Curricula,
    subject: Subjects,
    assignments: ScannedTimetableAssignment[],
    cache: Map<string, CurriculumItems>,
    counts: ImportCounts,
  ): Promise<CurriculumItems> {
    const key = `${curriculum.curriculumId}:${subject.subjectId}`;
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    const repo = manager.getRepository(CurriculumItems);
    let item = await repo.findOne({
      where: { curriculumId: curriculum.curriculumId, subjectId: subject.subjectId },
    });
    if (!item) {
      const weeklyHours = Math.max(
        1,
        new Set(
          assignments
            .filter(
              (assignment) =>
                assignment.gradeLevel === curriculum.gradeLevel &&
                assignment.subjectCode === subject.subjectCode &&
                getSpecializationTrack(assignment) === curriculum.trackName,
            )
            .map((assignment) => `${assignment.groupCode}:${assignment.dayOfWeek}:${assignment.period}`),
        ).size,
      );
      item = repo.create({
        curriculumId: curriculum.curriculumId,
        subjectId: subject.subjectId,
        weeklyHours,
        doubleSessionRequired: false,
        notes: 'Imported from teacher timetable PDF.',
      });
      item = await repo.save(item);
      counts.curriculumItems += 1;
    }
    cache.set(key, item);
    return item;
  }

  private async getOrCreateCourseInstance(
    manager: any,
    schoolYearId: number,
    assignment: ScannedTimetableAssignment,
    subject: Subjects,
    curriculumItem: CurriculumItems,
    group: ClassGroups,
    cache: Map<string, CourseInstances>,
    counts: ImportCounts,
  ): Promise<CourseInstances> {
    const trackName = getSpecializationTrack(assignment);
    const scopeType = trackName ? 'CLASS_GROUP' : 'GRADE';
    const key = trackName
      ? `${schoolYearId}:${group.classGroupId}:${subject.subjectId}`
      : `${schoolYearId}:${assignment.gradeLevel}:base:${subject.subjectId}`;
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    const repo = manager.getRepository(CourseInstances);
    let instance = await repo.findOne({
      where: {
        schoolYearId: String(schoolYearId),
        gradeLevel: assignment.gradeLevel,
        subjectId: subject.subjectId,
        scopeType,
        ...(trackName
          ? { classGroupId: group.classGroupId }
          : { classGroupId: IsNull() }),
      },
    });
    if (!instance) {
      const scopeSuffix = trackName ? `-${assignment.groupCode}` : '';
      instance = repo.create({
        subjectId: subject.subjectId,
        gradeLevel: assignment.gradeLevel,
        schoolYearId: String(schoolYearId),
        classGroupId: trackName ? group.classGroupId : null,
        scopeType,
        curriculumItemId: curriculumItem.curriculumItemId,
        weeklyHours: curriculumItem.weeklyHours,
        doubleSessionRequired: false,
        courseCode: `${subject.subjectCode}-G${assignment.gradeLevel}${scopeSuffix}`.slice(0, 50),
        courseName: trackName
          ? `${assignment.subjectName} ${assignment.groupCode}`
          : `${assignment.subjectName} grado ${assignment.gradeLevel}`,
        description: 'Imported from teacher timetable PDF.',
        isActive: true,
      });
      instance = await repo.save(instance);
      counts.courseInstances += 1;
    }
    cache.set(key, instance);
    return instance;
  }

  private async getOrCreateCourse(
    manager: any,
    instance: CourseInstances,
    group: ClassGroups,
    teacher: Users,
    cache: Map<string, Courses>,
    counts: ImportCounts,
  ): Promise<Courses> {
    const key = `${instance.courseInstanceId}:${group.classGroupId}:${teacher.nationalId}`;
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    const repo = manager.getRepository(Courses);
    let course = await repo.findOne({
      where: {
        courseInstanceId: instance.courseInstanceId,
        classGroupId: group.classGroupId,
        teacherId: teacher.nationalId,
      },
    });
    if (!course) {
      course = repo.create({
        courseInstanceId: instance.courseInstanceId,
        classGroupId: group.classGroupId,
        teacherId: teacher.nationalId,
      });
      course = await repo.save(course);
      counts.courses += 1;
    }
    cache.set(key, course);
    return course;
  }

  private async getOrCreateSlot(
    manager: any,
    assignment: ScannedTimetableAssignment,
    cache: Map<string, TimetableSlot>,
    counts: ImportCounts,
  ): Promise<TimetableSlot> {
    const key = `${assignment.dayOfWeek}:${assignment.startTime}:${assignment.endTime}`;
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    const repo = manager.getRepository(TimetableSlot);
    let slot = await repo.findOne({
      where: {
        dayOfWeek: assignment.dayOfWeek,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
      },
    });
    if (!slot) {
      slot = repo.create({
        dayOfWeek: assignment.dayOfWeek,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        durationMinutes: 60,
        division: getDivisionForGrade(assignment.gradeLevel),
      });
      slot = await repo.save(slot);
      counts.slots += 1;
    }
    cache.set(key, slot);
    return slot;
  }

  private async tryCreateAssignment(
    manager: any,
    course: Courses,
    group: ClassGroups,
    teacher: Users,
    slot: TimetableSlot,
  ): Promise<boolean> {
    const repo = manager.getRepository(TimetableAssignments);
    const slotId = String(slot.slotId);
    const existing = await repo.findOne({
      where: [
        { courseId: course.courseId, slotId },
        { classGroupId: group.classGroupId, slotId },
        { teacherId: teacher.nationalId, slotId },
      ],
    });
    if (existing) {
      return false;
    }

    await repo.save(
      repo.create({
        courseId: course.courseId,
        slotId,
        teacherId: teacher.nationalId,
        classGroupId: group.classGroupId,
        classroomId: null,
      }),
    );
    return true;
  }
}
