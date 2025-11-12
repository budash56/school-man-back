import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TimetableAssignments } from './timetable_assignments.entity';
import { TimetableAssignmentsRepository } from './timetable_assignments.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { AccessService } from '../auth/access.service';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { CreateTimetableAssignmentDto } from './dto/create-timetable-assignment.dto';
import { UpdateTimetableAssignmentDto } from './dto/update-timetable-assignment.dto';
import { TimetableAssignmentsQueryDto } from './dto/timetable-assignments-query.dto';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { ClassroomsRepository } from '../classrooms/classrooms.repository';

type ActingUser = {
  userId: number;
  role: string;
};

type TimetableAssignmentResult = {
  assignment: TimetableAssignments;
  warnings: string[];
};

@Injectable()
export class TimetableAssignmentsService {
  constructor(
    private readonly assignmentsRepository: TimetableAssignmentsRepository,
    private readonly coursesRepository: CoursesRepository,
    private readonly schoolYearsRepository: SchoolYearsRepository,
    private readonly enrollmentsRepository: EnrollmentsRepository,
    private readonly classroomsRepository: ClassroomsRepository,
    private readonly accessService: AccessService,
  ) {}

  async findAll(
    query: TimetableAssignmentsQueryDto,
    currentUser?: ActingUser,
  ): Promise<TimetableAssignments[]> {
    const qb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.course', 'course')
      .leftJoinAndSelect('assignment.slot', 'slot')
      .leftJoinAndSelect('assignment.classroom', 'classroom');

    if (query.courseId !== undefined) {
      qb.andWhere('assignment.courseId = :courseId', {
        courseId: query.courseId.toString(),
      });
    }

    if (query.classGroupId !== undefined) {
      qb.andWhere('assignment.classGroupId = :classGroupId', {
        classGroupId: query.classGroupId.toString(),
      });
    }

    if (query.teacherId !== undefined) {
      qb.andWhere('assignment.teacherId = :teacherId', {
        teacherId: query.teacherId,
      });
    }

    if (query.slotId !== undefined) {
      qb.andWhere('assignment.slotId = :slotId', {
        slotId: query.slotId.toString(),
      });
    }

    if (currentUser?.role === 'teacher') {
      const classGroupIds = await this.accessService.classGroupIdsForTeacher(
        currentUser.userId ?? 0,
      );

      if (classGroupIds.length === 0) {
        return [];
      }

      qb.andWhere('assignment.classGroupId IN (:...allowedClassGroupIds)', {
        allowedClassGroupIds: classGroupIds.map((id) => id.toString()),
      });
    }

    return qb.getMany();
  }

  async findOneOrThrow(
    id: string,
    currentUser?: ActingUser,
  ): Promise<TimetableAssignments> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { assignmentId: id },
      relations: { course: true },
    });

    if (!assignment) {
      throw new NotFoundException('TimetableAssignments record not found');
    }

    if (currentUser?.role === 'teacher') {
      const canAccess = await this.accessService.isTeacherOfCourse(
        currentUser.userId ?? 0,
        Number(assignment.courseId),
      );
      if (!canAccess) {
        throw new ForbiddenException(
          'You are not allowed to access this timetable assignment',
        );
      }
    }

    return assignment;
  }

  async create(
    dto: CreateTimetableAssignmentDto,
    user?: { role?: string },
  ): Promise<TimetableAssignmentResult> {
    const courseId = dto.courseId ?? null;
    if (!courseId) {
      throw new BadRequestException('courseId is required');
    }

    if (dto.slotId === undefined) {
      throw new BadRequestException('slotId is required');
    }

    const { schoolYearId, classGroupId: courseClassGroupId } =
      await this.resolveCourseContext(courseId);
    await this.assertYearWritable(schoolYearId, user);

    const effectiveClassGroupId =
      dto.classGroupId ?? courseClassGroupId ?? undefined;

    await this.assertNoConflicts({
      courseId,
      slotId: dto.slotId,
      classGroupId: effectiveClassGroupId,
      teacherId: dto.teacherId,
      classroomId: dto.classroomId,
    });

    const entityPayload: Partial<TimetableAssignments> = {
      courseId: courseId.toString(),
      slotId: dto.slotId.toString(),
      teacherId: dto.teacherId ?? null,
      classGroupId: effectiveClassGroupId
        ? effectiveClassGroupId.toString()
        : null,
    };

    if (dto.classroomId !== undefined) {
      entityPayload.classroomId = dto.classroomId.toString();
      entityPayload.classroom = {
        classroomId: dto.classroomId.toString(),
      } as TimetableAssignments['classroom'];
    }

    const entity = this.assignmentsRepository.create(entityPayload);
    const saved = await this.assignmentsRepository.save(entity);
    const warnings = await this.buildWarnings(
      effectiveClassGroupId,
      dto.classroomId,
    );
    return { assignment: saved, warnings };
  }

  async update(
    id: string,
    dto: UpdateTimetableAssignmentDto,
    user?: { role?: string },
  ): Promise<TimetableAssignmentResult> {
    const entity = await this.assignmentsRepository.findOne({
      where: { assignmentId: id },
    });

    if (!entity) {
      throw new NotFoundException('TimetableAssignments record not found');
    }

    const nextCourseIdValue =
      dto.courseId !== undefined ? dto.courseId : Number(entity.courseId);
    if (!Number.isFinite(nextCourseIdValue)) {
      throw new BadRequestException('courseId is required');
    }

    const { schoolYearId, classGroupId: courseClassGroupId } =
      await this.resolveCourseContext(nextCourseIdValue);
    await this.assertYearWritable(schoolYearId, user);

    const nextSlotId =
      dto.slotId !== undefined
        ? dto.slotId
        : entity.slotId
        ? Number(entity.slotId)
        : undefined;
    if (!Number.isFinite(nextSlotId)) {
      throw new BadRequestException('slotId is required');
    }
    const requestedClassroomId = (
      dto as UpdateTimetableAssignmentDto & { classroomId?: number | null }
    ).classroomId;

    const nextClassGroupId =
      dto.classGroupId !== undefined
        ? dto.classGroupId
        : entity.classGroupId
        ? Number(entity.classGroupId)
        : courseClassGroupId;
    const nextTeacherId =
      dto.teacherId !== undefined ? dto.teacherId : entity.teacherId ?? undefined;
    const nextClassroomId =
      requestedClassroomId !== undefined
        ? requestedClassroomId ?? undefined
        : entity.classroomId
        ? Number(entity.classroomId)
        : undefined;

    await this.assertNoConflicts({
      courseId: Number(nextCourseIdValue),
      slotId: nextSlotId,
      classGroupId: nextClassGroupId,
      teacherId: nextTeacherId,
      classroomId: nextClassroomId,
      ignoreAssignmentId: entity.assignmentId,
    });

    const updatedFields: Partial<TimetableAssignments> = {};

    if (dto.courseId !== undefined) {
      updatedFields.courseId = dto.courseId.toString();
    }

    if (dto.slotId !== undefined) {
      updatedFields.slotId = dto.slotId.toString();
    }

    if (dto.teacherId !== undefined) {
      updatedFields.teacherId = dto.teacherId ?? null;
    }

    if (nextClassGroupId !== undefined) {
      updatedFields.classGroupId = nextClassGroupId
        ? nextClassGroupId.toString()
        : null;
    }

    if (requestedClassroomId !== undefined) {
      updatedFields.classroomId =
        requestedClassroomId === null ? null : requestedClassroomId.toString();
      updatedFields.classroom =
        requestedClassroomId === null
          ? undefined
          : ({
              classroomId: requestedClassroomId.toString(),
            } as TimetableAssignments['classroom']);
    }

    this.assignmentsRepository.merge(entity, updatedFields);
    const saved = await this.assignmentsRepository.save(entity);
    const warnings = await this.buildWarnings(
      nextClassGroupId,
      nextClassroomId,
    );
    return { assignment: saved, warnings };
  }

  async remove(
    id: string,
    user?: { role?: string },
  ): Promise<{ deleted: true }> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { assignmentId: id },
    });

    if (!assignment) {
      throw new NotFoundException('TimetableAssignments record not found');
    }

    const { schoolYearId } = await this.resolveCourseContext(
      Number(assignment.courseId),
    );
    await this.assertYearWritable(schoolYearId, user);

    await this.assignmentsRepository.remove(assignment);
    return { deleted: true };
  }

  private async resolveCourseContext(
    courseId: string | number,
  ): Promise<{ schoolYearId: number; classGroupId?: number }> {
    const course = await this.coursesRepository.findOne({
      where: { courseId: courseId.toString() },
      relations: { courseInstance: true, classGroup: true },
    });

    if (!course || !course.courseInstance?.schoolYearId) {
      throw new ConflictException('Course is missing schedule information');
    }

    const schoolYearId = Number(course.courseInstance.schoolYearId);
    if (!Number.isFinite(schoolYearId)) {
      throw new ConflictException('Course is missing schedule information');
    }

    const classGroupId = course.classGroup?.classGroupId
      ? Number(course.classGroup.classGroupId)
      : undefined;

    return { schoolYearId, classGroupId };
  }

  private async assertYearWritable(
    schoolYearId: number,
    user?: { role?: string },
  ): Promise<void> {
    const year = await this.schoolYearsRepository.findOne({
      where: { schoolYearId: schoolYearId.toString() },
    });

    if (!year) {
      throw new NotFoundException('School year not found');
    }

    if (year.isActive) {
      return;
    }

    const role = user?.role ?? 'admin';
    if (role !== 'admin') {
      throw new ForbiddenException('Past years are read-only');
    }
  }

  private async buildWarnings(
    classGroupId?: number,
    classroomId?: number,
  ): Promise<string[]> {
    if (!classGroupId || !classroomId) {
      return [];
    }

    const [activeStudents, classroom] = await Promise.all([
      this.enrollmentsRepository.count({
        where: {
          classGroupId: classGroupId.toString(),
          active: true,
        },
      }),
      this.classroomsRepository.findOne({
        where: { classroomId: classroomId.toString() },
      }),
    ]);

    if (!classroom || classroom.capacity === null || classroom.capacity === undefined) {
      return [];
    }

    if (activeStudents > classroom.capacity) {
      return ['CLASSROOM_CAPACITY_EXCEEDED'];
    }

    return [];
  }

  private async assertNoConflicts(args: {
    courseId: number;
    slotId?: number;
    classGroupId?: number;
    teacherId?: string;
    classroomId?: number;
    ignoreAssignmentId?: string;
  }): Promise<void> {
    const {
      courseId,
      slotId,
      classGroupId,
      teacherId,
      classroomId,
      ignoreAssignmentId,
    } = args;
    if (!slotId) {
      return;
    }

    const slotIdStr = slotId.toString();

    await Promise.all([
      this.checkClassGroupSlotConflict(classGroupId, slotIdStr, ignoreAssignmentId),
      this.checkTeacherSlotConflict(teacherId, slotIdStr, ignoreAssignmentId),
      this.checkCourseSlotConflict(courseId, slotIdStr, ignoreAssignmentId),
      this.checkClassroomSlotConflict(classroomId, slotIdStr, ignoreAssignmentId),
      this.checkTeacherClassGroupSlotConflict(
        teacherId,
        classGroupId,
        slotIdStr,
        ignoreAssignmentId,
      ),
    ]);
  }

  private async checkClassGroupSlotConflict(
    classGroupId: number | undefined,
    slotId: string,
    ignoreAssignmentId?: string,
  ): Promise<void> {
    if (classGroupId === undefined) {
      return;
    }

    const qb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .where('assignment.slotId = :slotId', { slotId })
      .andWhere('assignment.classGroupId = :classGroupId', {
        classGroupId: classGroupId.toString(),
      });

    if (ignoreAssignmentId) {
      qb.andWhere('assignment.assignmentId != :ignoreAssignmentId', {
        ignoreAssignmentId,
      });
    }

    const count = await qb.getCount();

    if (count > 0) {
      throw new ConflictException(
        'This class group already has an assignment for the selected slot',
      );
    }
  }

  private async checkTeacherSlotConflict(
    teacherId: string | undefined,
    slotId: string,
    ignoreAssignmentId?: string,
  ): Promise<void> {
    if (!teacherId) {
      return;
    }

    const qb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .where('assignment.slotId = :slotId', { slotId })
      .andWhere('assignment.teacherId = :teacherId', { teacherId });

    if (ignoreAssignmentId) {
      qb.andWhere('assignment.assignmentId != :ignoreAssignmentId', {
        ignoreAssignmentId,
      });
    }

    const count = await qb.getCount();

    if (count > 0) {
      throw new ConflictException(
        'Teacher already has an assignment in this slot',
      );
    }
  }

  private async checkCourseSlotConflict(
    courseId: number,
    slotId: string,
    ignoreAssignmentId?: string,
  ): Promise<void> {
    const qb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .where('assignment.slotId = :slotId', { slotId })
      .andWhere('assignment.courseId = :courseId', {
        courseId: courseId.toString(),
      });

    if (ignoreAssignmentId) {
      qb.andWhere('assignment.assignmentId != :ignoreAssignmentId', {
        ignoreAssignmentId,
      });
    }

    const count = await qb.getCount();

    if (count > 0) {
      throw new ConflictException(
        'This course already has an assignment for the selected slot',
      );
    }
  }

  private async checkClassroomSlotConflict(
    classroomId: number | undefined,
    slotId: string,
    ignoreAssignmentId?: string,
  ): Promise<void> {
    if (classroomId === undefined) {
      return;
    }

    const qb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .where('assignment.slotId = :slotId', { slotId })
      .andWhere('assignment.classroomId = :classroomId', {
        classroomId: classroomId.toString(),
      });

    if (ignoreAssignmentId) {
      qb.andWhere('assignment.assignmentId != :ignoreAssignmentId', {
        ignoreAssignmentId,
      });
    }

    const count = await qb.getCount();

    if (count > 0) {
      throw new ConflictException(
        'Classroom already has an assignment for this slot',
      );
    }
  }

  private async checkTeacherClassGroupSlotConflict(
    teacherId: string | undefined,
    classGroupId: number | undefined,
    slotId: string,
    ignoreAssignmentId?: string,
  ): Promise<void> {
    if (!teacherId || classGroupId === undefined) {
      return;
    }

    const qb = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .where('assignment.slotId = :slotId', { slotId })
      .andWhere('assignment.teacherId = :teacherId', { teacherId })
      .andWhere('assignment.classGroupId = :classGroupId', {
        classGroupId: classGroupId.toString(),
      });

    if (ignoreAssignmentId) {
      qb.andWhere('assignment.assignmentId != :ignoreAssignmentId', {
        ignoreAssignmentId,
      });
    }

    const count = await qb.getCount();

    if (count > 0) {
      throw new ConflictException(
        'This teacher already teaches the class group in the selected slot',
      );
    }
  }
}
