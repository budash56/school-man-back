import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DeepPartial } from 'typeorm';
import { TimetableAssignments } from './timetable_assignments.entity';
import { TimetableAssignmentsRepository } from './timetable_assignments.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { AccessService } from '../auth/access.service';
import { SchoolYearsRepository } from '../school_years/school_years.repository';

type ActingUser = {
  userId: number;
  role: string;
};

export type TimetableAssignmentsQuery = {
  courseId?: number;
  classGroupId?: number;
  teacherId?: number;
  slotId?: number;
};

@Injectable()
export class TimetableAssignmentsService {
  constructor(
    private readonly assignmentsRepository: TimetableAssignmentsRepository,
    private readonly coursesRepository: CoursesRepository,
    private readonly schoolYearsRepository: SchoolYearsRepository,
  ) {}

  async findAll(
    query: TimetableAssignmentsQuery,
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
        teacherId: query.teacherId.toString(),
      });
    }

    if (query.slotId !== undefined) {
      qb.andWhere('assignment.slotId = :slotId', {
        slotId: query.slotId.toString(),
      });
    }

    if (currentUser?.role === 'teacher') {
      const accessService = new AccessService(this.coursesRepository);
      const classGroupIds = await accessService.classGroupIdsForTeacher(currentUser.userId);

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
    dto: DeepPartial<TimetableAssignments>,
    user?: { role?: string },
  ): Promise<TimetableAssignments> {
    const courseId = dto.courseId ?? null;
    if (!courseId) {
      throw new BadRequestException('courseId is required');
    }

    const schoolYearId = await this.resolveCourseYear(courseId);
    await this.assertYearWritable(schoolYearId, user);

    const entity = this.assignmentsRepository.create(dto);
    return this.assignmentsRepository.save(entity);
  }

  async update(
    id: string,
    dto: DeepPartial<TimetableAssignments>,
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

    this.assignmentsRepository.merge(entity, dto);
    return this.assignmentsRepository.save(entity);
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
}
