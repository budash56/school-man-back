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

type ActingUser = {
  userId: number;
  role: string;
};

@Injectable()
export class TimetableAssignmentsService {
  constructor(
    private readonly assignmentsRepository: TimetableAssignmentsRepository,
    private readonly coursesRepository: CoursesRepository,
    private readonly schoolYearsRepository: SchoolYearsRepository,
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
      const accessService = new AccessService(this.coursesRepository);
      const classGroupIds = await accessService.classGroupIdsForTeacher(
        currentUser.userId,
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

  async create(
    dto: CreateTimetableAssignmentDto,
    user?: { role?: string },
  ): Promise<TimetableAssignments> {
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
    return this.assignmentsRepository.save(entity);
  }

  async update(
    id: string,
    dto: UpdateTimetableAssignmentDto,
    user?: { role?: string },
  ): Promise<TimetableAssignments> {
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
    const nextClassGroupId =
      dto.classGroupId !== undefined
        ? dto.classGroupId
        : entity.classGroupId
        ? Number(entity.classGroupId)
        : courseClassGroupId;
    const nextTeacherId =
      dto.teacherId !== undefined ? dto.teacherId : entity.teacherId ?? undefined;
    const nextClassroomId =
      dto.classroomId !== undefined
        ? dto.classroomId
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

    if (dto.classroomId !== undefined) {
      updatedFields.classroomId =
        dto.classroomId !== null ? dto.classroomId?.toString() ?? null : null;
      updatedFields.classroom = dto.classroomId
        ? ({ classroomId: dto.classroomId.toString() } as TimetableAssignments['classroom'])
        : null;
    }

    this.assignmentsRepository.merge(entity, updatedFields);
    return this.assignmentsRepository.save(entity);
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
