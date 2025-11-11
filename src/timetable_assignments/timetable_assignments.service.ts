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

    const schoolYearId = await this.resolveCourseYear(courseId);
    await this.assertYearWritable(schoolYearId, user);

    await this.assertNoConflicts({
      courseId,
      slotId: dto.slotId,
      classGroupId: dto.classGroupId,
      teacherId: dto.teacherId,
    });

    const entityPayload: Partial<TimetableAssignments> = {
      courseId: courseId.toString(),
      slotId: dto.slotId !== undefined ? dto.slotId.toString() : null,
      teacherId: dto.teacherId ?? null,
      classGroupId:
        dto.classGroupId !== undefined ? dto.classGroupId.toString() : null,
    };

    if (dto.classroomId !== undefined) {
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

    const nextCourseId = dto.courseId ?? entity.courseId;
    if (!nextCourseId) {
      throw new BadRequestException('courseId is required');
    }

    const schoolYearId = await this.resolveCourseYear(nextCourseId);
    await this.assertYearWritable(schoolYearId, user);

    const nextSlotId =
      dto.slotId !== undefined
        ? dto.slotId
        : entity.slotId
        ? Number(entity.slotId)
        : undefined;
    const nextClassGroupId =
      dto.classGroupId !== undefined
        ? dto.classGroupId
        : entity.classGroupId
        ? Number(entity.classGroupId)
        : undefined;
    const nextTeacherId =
      dto.teacherId !== undefined ? dto.teacherId : entity.teacherId ?? undefined;

    await this.assertNoConflicts({
      courseId: Number(nextCourseId),
      slotId: nextSlotId,
      classGroupId: nextClassGroupId,
      teacherId: nextTeacherId,
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

    if (dto.classGroupId !== undefined) {
      updatedFields.classGroupId = dto.classGroupId.toString();
    }

    if (dto.classroomId !== undefined) {
      updatedFields.classroom = {
        classroomId: dto.classroomId.toString(),
      } as TimetableAssignments['classroom'];
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

    const schoolYearId = await this.resolveCourseYear(assignment.courseId);
    await this.assertYearWritable(schoolYearId, user);

    await this.assignmentsRepository.remove(assignment);
    return { deleted: true };
  }

  private async resolveCourseYear(courseId: string | number): Promise<number> {
    const course = await this.coursesRepository.findOne({
      where: { courseId: courseId.toString() },
      relations: { courseInstance: true },
    });

    if (!course || !course.courseInstance?.schoolYearId) {
      throw new ConflictException('Course is missing schedule information');
    }

    const schoolYearId = Number(course.courseInstance.schoolYearId);
    if (!Number.isFinite(schoolYearId)) {
      throw new ConflictException('Course is missing schedule information');
    }

    return schoolYearId;
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
    ignoreAssignmentId?: string;
  }): Promise<void> {
    const { courseId, slotId, classGroupId, teacherId, ignoreAssignmentId } = args;
    if (!slotId) {
      return;
    }

    const slotIdStr = slotId.toString();

    await Promise.all([
      this.checkClassGroupSlotConflict(classGroupId, slotIdStr, ignoreAssignmentId),
      this.checkTeacherSlotConflict(teacherId, slotIdStr, ignoreAssignmentId),
      this.checkCourseSlotConflict(courseId, slotIdStr, ignoreAssignmentId),
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
      throw new ConflictException('Another timetable entry already uses this slot for the class group');
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
      throw new ConflictException('Teacher already has an assignment at this slot');
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
      throw new ConflictException('Course already has a timetable entry for this slot');
    }
  }
}
