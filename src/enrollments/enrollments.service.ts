import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ClassGroupsRepository } from '../class_groups/class_groups.repository';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { StudentsRepository } from '../students/students.repository';
import { CoursesRepository } from '../courses/courses.repository';
import { Enrollments } from './enrollments.entity';
import { EnrollmentsRepository } from './enrollments.repository';
import { EnrollmentsQueryDto } from './dto/enrollments-query.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { buildPaginationResult, PaginatedResult, resolvePagination } from '../shared/pagination';
import { AccessService } from '../auth/access.service';

type ActingUser = {
  userId: number;
  role: string;
};

export type EnrollmentResponse = {
  enrollmentId: number;
  studentId: number;
  classGroupId: number;
  schoolYearId: number;
  active: boolean;
  enrolledAt: Date | null;
};

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly enrollmentsRepository: EnrollmentsRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly classGroupsRepository: ClassGroupsRepository,
    private readonly schoolYearsRepository: SchoolYearsRepository,
    private readonly coursesRepository: CoursesRepository,
  ) {}

  async findAll(
    query: EnrollmentsQueryDto,
    currentUser?: ActingUser,
  ): Promise<PaginatedResult<EnrollmentResponse>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);

    const qb = this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .leftJoinAndSelect('enrollment.student', 'student')
      .leftJoinAndSelect('enrollment.classGroup', 'classGroup')
      .leftJoinAndSelect('enrollment.schoolYear', 'schoolYear')
      .orderBy('enrollment.enrolledAt', 'DESC')
      .addOrderBy('enrollment.enrollmentId', 'DESC');

    if (query.studentId !== undefined) {
      qb.andWhere('enrollment.studentId = :studentId', {
        studentId: query.studentId.toString(),
      });
    }

    if (query.classGroupId !== undefined) {
      qb.andWhere('enrollment.classGroupId = :classGroupId', {
        classGroupId: query.classGroupId.toString(),
      });
    }

    if (query.schoolYearId !== undefined) {
      qb.andWhere('enrollment.schoolYearId = :schoolYearId', {
        schoolYearId: query.schoolYearId.toString(),
      });
    }

    if (currentUser?.role === 'teacher') {
      const accessService = new AccessService(this.coursesRepository);
      const classGroupIds = await accessService.classGroupIdsForTeacher(currentUser.userId);

      if (classGroupIds.length === 0) {
        return buildPaginationResult([], 0, page, pageSize);
      }

      qb.andWhere('enrollment.classGroupId IN (:...allowedClassGroupIds)', {
        allowedClassGroupIds: classGroupIds.map((id) => id.toString()),
      });
    }

    qb.skip((page - 1) * pageSize);
    qb.take(pageSize);

    const [entities, total] = await qb.getManyAndCount();
    return buildPaginationResult(
      entities.map((entity) => this.toResponse(entity)),
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: number): Promise<EnrollmentResponse> {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { enrollmentId: id.toString() },
      relations: {
        student: true,
        classGroup: true,
        schoolYear: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return this.toResponse(enrollment);
  }

  async create(dto: CreateEnrollmentDto, currentUser?: ActingUser): Promise<EnrollmentResponse> {
    const student = await this.resolveStudent(dto.studentId);
    const classGroup = await this.resolveClassGroup(dto.classGroupId);
    const schoolYear = await this.resolveSchoolYear(dto.schoolYearId);

    this.assertClassGroupMatchesSchoolYear(classGroup.schoolYearId, schoolYear.schoolYearId);

    const classGroupYearId = Number(classGroup.schoolYearId);
    if (!Number.isFinite(classGroupYearId)) {
      throw new ConflictException('Class group has invalid school year reference');
    }

    await this.assertYearWritable(classGroupYearId, currentUser);

    const entity = this.enrollmentsRepository.create({
      studentId: student.studentId,
      classGroupId: classGroup.classGroupId,
      schoolYearId: schoolYear.schoolYearId,
      active: true,
    });

    try {
      const saved = await this.enrollmentsRepository.save(entity);
      return this.findOne(Number(saved.enrollmentId));
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Student already has an active enrollment for this school year',
      );
    }
  }

  async deactivate(id: number, currentUser?: ActingUser): Promise<EnrollmentResponse> {
    const enrollment = await this.getEnrollmentEntity(id);

    if (enrollment.active === false) {
      return this.toResponse(enrollment);
    }

    const schoolYearId =
      enrollment.classGroup?.schoolYearId ??
      enrollment.schoolYear?.schoolYearId ??
      enrollment.schoolYearId;
    const numericYearId = Number(schoolYearId);
    if (!Number.isFinite(numericYearId)) {
      throw new ConflictException('Enrollment has invalid school year reference');
    }

    await this.assertYearWritable(numericYearId, currentUser);

    enrollment.active = false;

    const saved = await this.enrollmentsRepository.save(enrollment);
    return this.toResponse(saved);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const enrollment = await this.getEnrollmentEntity(id);
    await this.enrollmentsRepository.remove(enrollment);
    return { deleted: true };
  }

  private async getEnrollmentEntity(id: number): Promise<Enrollments> {
    const enrollment = await this.enrollmentsRepository.findOne({
      where: { enrollmentId: id.toString() },
      relations: {
        student: true,
        classGroup: true,
        schoolYear: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return enrollment;
  }

  private async resolveStudent(id: number) {
    const student = await this.studentsRepository.findOne({
      where: { studentId: id.toString() },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  private async resolveClassGroup(id: number) {
    const classGroup = await this.classGroupsRepository.findOne({
      where: { classGroupId: id.toString() },
    });

    if (!classGroup) {
      throw new NotFoundException('Class group not found');
    }

    return classGroup;
  }

  private async resolveSchoolYear(id: number) {
    const schoolYear = await this.schoolYearsRepository.findOne({
      where: { schoolYearId: id.toString() },
    });

    if (!schoolYear) {
      throw new NotFoundException('School year not found');
    }

    return schoolYear;
  }

  private assertClassGroupMatchesSchoolYear(
    classGroupSchoolYearId: string,
    schoolYearId: string,
  ): void {
    if (classGroupSchoolYearId !== schoolYearId) {
      throw new ConflictException('Class group belongs to a different school year');
    }
  }

  private async assertYearWritable(
    schoolYearId: number,
    user?: ActingUser,
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

    if ((user?.role ?? 'admin') !== 'admin') {
      throw new ForbiddenException('Past years are read-only');
    }
  }

  private toResponse(enrollment: Enrollments): EnrollmentResponse {
    return {
      enrollmentId: Number(enrollment.enrollmentId),
      studentId: Number(enrollment.studentId),
      classGroupId: Number(enrollment.classGroupId),
      schoolYearId: Number(enrollment.schoolYearId),
      active: enrollment.active ?? false,
      enrolledAt: enrollment.enrolledAt ?? null,
    };
  }
}
