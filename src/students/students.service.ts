import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Brackets } from 'typeorm';
import { Students } from './students.entity';
import { StudentsRepository } from './students.repository';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsQueryDto } from './dto/students-query.dto';
import {
  buildPaginationResult,
  PaginatedResult,
  resolvePagination,
} from '../shared/pagination';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { GradesRepository } from '../grades/grades.repository';
import { AttendanceRepository } from '../attendance/attendance.repository';
import { ClassGroupsRepository } from '../class_groups/class_groups.repository';
import type { SanitizedUser } from '../auth/auth.types';

@Injectable()
export class StudentsService {
  constructor(
    private readonly repository: StudentsRepository,
    private readonly enrollmentsRepository: EnrollmentsRepository,
    private readonly schoolYearsRepository: SchoolYearsRepository,
    private readonly gradesRepository: GradesRepository,
    private readonly attendanceRepository: AttendanceRepository,
    private readonly classGroupsRepository: ClassGroupsRepository,
  ) {}

  async findAll(
    query: StudentsQueryDto,
    currentUser?: SanitizedUser,
  ): Promise<PaginatedResult<Students>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);
    const qb = this.repository.createQueryBuilder('students');

    qb.where('students.deleted_at IS NULL');

    if (query.q?.trim()) {
      const keyword = this.buildSearchKeyword(query.q);
      qb.andWhere(
        new Brackets((searchQb) => {
          searchQb
            .where("students.first_name ILIKE :keyword ESCAPE '\\'")
            .orWhere("students.last_name ILIKE :keyword ESCAPE '\\'")
            .orWhere("students.national_id ILIKE :keyword ESCAPE '\\'");
        }),
      ).setParameter('keyword', keyword);
    }

    if (query.year) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM enrollments e
          WHERE e.student_id = students.student_id
            AND e.school_year_id = :filterYear
        )`,
        { filterYear: query.year.toString() },
      );
    }

    if (currentUser?.role === 'teacher') {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM enrollments e
          JOIN courses c ON c.class_group_id = e.class_group_id
          WHERE e.student_id = students.student_id
            AND c.teacher_id = :teacherId
        )`,
        { teacherId: currentUser.nationalId },
      );
    }

    qb.orderBy('students.created_at', 'DESC');
    qb.skip((page - 1) * pageSize);
    qb.take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginationResult(data, total, page, pageSize);
  }

  async findOne(id: number, currentUser?: SanitizedUser): Promise<Students> {
    if (currentUser?.role === 'teacher') {
      const hasAccess = await this.repository
        .createQueryBuilder('students')
        .select('students.student_id')
        .innerJoin('enrollments', 'e', 'e.student_id = students.student_id')
        .innerJoin('courses', 'c', 'c.class_group_id = e.class_group_id')
        .where('students.student_id = :id', { id })
        .andWhere('c.teacher_id = :teacherId', {
          teacherId: currentUser.nationalId,
        })
        .getRawOne();

      if (!hasAccess) {
        throw new NotFoundException('Student not found');
      }
    }

    return this.loadStudent(id);
  }

  async create(dto: CreateStudentDto): Promise<Students> {
    await this.assertNationalIdAvailable(dto.nationalId);

    const guardianRelationship = this.resolveGuardianRelationship(
      dto.guardianRelationship,
      dto.guardianRelationshipOther,
    );

    const entity = this.repository.create({
      nationalId: dto.nationalId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dob: dto.dob ?? null,
      address: dto.address ?? null,
      guardianName: dto.guardianName,
      guardianRelationship,
      guardianPhone: dto.guardianPhone,
      gender: dto.gender,
      isActive: true,
    });

    return this.repository.save(entity);
  }

  async update(id: number, dto: UpdateStudentDto): Promise<Students> {
    const student = await this.findOne(id);

    if (dto.nationalId && dto.nationalId !== student.nationalId) {
      await this.assertNationalIdAvailable(dto.nationalId, student.studentId);
    }

    const {
      guardianRelationship,
      guardianRelationshipOther,
      guardianName,
      guardianPhone,
      dob,
      address,
      ...rest
    } = dto;

    const resolvedRelationship = this.resolveGuardianRelationship(
      guardianRelationship,
      guardianRelationshipOther,
      student.guardianRelationship,
    );

    this.repository.merge(student, {
      ...rest,
      guardianName: guardianName ?? student.guardianName,
      guardianPhone: guardianPhone ?? student.guardianPhone,
      guardianRelationship: resolvedRelationship,
      dob: dob ?? student.dob,
      address: address ?? student.address,
    });

    return this.repository.save(student);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const student = await this.loadStudent(id);
    const activeYear = await this.getActiveSchoolYear();

    if (!activeYear) {
      return { deleted: true };
    }

    await this.deactivateStudentForYear(
      student.studentId,
      activeYear.schoolYearId,
    );

    student.deletedAt = new Date();
    student.isActive = false;
    await this.repository.save(student);

    return { deleted: true };
  }

  async restoreForYear(id: number, year: number): Promise<Students> {
    const student = await this.loadStudent(id, { includeDeleted: true });
    const schoolYear = await this.schoolYearsRepository.findOne({
      where: { schoolYearId: year.toString() },
    });

    if (!schoolYear) {
      throw new NotFoundException('School year not found');
    }

    let enrollment = await this.enrollmentsRepository.findOne({
      where: {
        studentId: student.studentId,
        schoolYearId: schoolYear.schoolYearId,
      },
    });

    if (!enrollment) {
      const latest = await this.enrollmentsRepository.findOne({
        where: { studentId: student.studentId },
        order: { enrolledAt: 'DESC' },
      });

      const fallbackClassGroupId =
        latest?.classGroupId ??
        (
          await this.classGroupsRepository.findOne({
            where: { schoolYearId: schoolYear.schoolYearId },
          })
        )?.classGroupId;

      if (!fallbackClassGroupId) {
        throw new NotFoundException('Inactive enrollment not found for year');
      }

      enrollment = this.enrollmentsRepository.create({
        studentId: student.studentId,
        classGroupId: fallbackClassGroupId,
        schoolYearId: schoolYear.schoolYearId,
        active: true,
      });
    } else if (!enrollment.active) {
      enrollment.active = true;
    }

    await this.enrollmentsRepository.save(enrollment);

    student.deletedAt = null;
    student.isActive = true;
    return this.repository.save(student);
  }

  private buildSearchKeyword(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) {
      return '%%';
    }

    const escaped = trimmed.replace(/[%_]/g, (match) => `\\${match}`);
    return `%${escaped}%`;
  }

  private resolveGuardianRelationship(
    relationship?: string,
    relationshipOther?: string,
    fallback?: string | null,
  ): string | null {
    if (!relationship) {
      return fallback ?? null;
    }

    if (relationship === 'Otro') {
      const other = relationshipOther?.trim();
      if (!other) {
        throw new ConflictException(
          'Parentesco requerido cuando se selecciona "Otro".',
        );
      }
      return other;
    }

    return relationship;
  }

  private async assertNationalIdAvailable(
    nationalId: string,
    currentStudentId?: string,
  ): Promise<void> {
    const existing = await this.repository.findOne({
      where: { nationalId },
      withDeleted: true,
    });

    if (existing && existing.studentId !== currentStudentId) {
      throw new ConflictException(
        'A student with this national ID already exists',
      );
    }
  }

  private async loadStudent(
    id: number,
    options?: { includeDeleted?: boolean },
  ): Promise<Students> {
    const student = await this.repository.findOne({
      where: { studentId: id.toString() },
      withDeleted: options?.includeDeleted ?? false,
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (!options?.includeDeleted && student.deletedAt) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  private async getActiveSchoolYear() {
    return this.schoolYearsRepository.findOne({
      where: { isActive: true },
    });
  }

  private async deactivateStudentForYear(
    studentId: string,
    schoolYearId: string,
  ): Promise<void> {
    const enrollments = await this.enrollmentsRepository.find({
      where: {
        studentId,
        schoolYearId,
      },
    });

    if (enrollments.length > 0) {
      await this.enrollmentsRepository.save(
        enrollments.map((enrollment) => ({
          ...enrollment,
          active: false,
        })),
      );
    }

    await this.removeGradesForYear(studentId, schoolYearId);
    await this.removeAttendanceForYear(studentId, schoolYearId);
  }

  private async removeGradesForYear(
    studentId: string,
    schoolYearId: string,
  ): Promise<void> {
    const grades = await this.gradesRepository
      .createQueryBuilder('grade')
      .innerJoinAndSelect('grade.term', 'term')
      .where('grade.studentId = :studentId', { studentId })
      .andWhere('term.schoolYearId = :schoolYearId', { schoolYearId })
      .getMany();

    if (grades.length > 0) {
      await this.gradesRepository.remove(grades);
    }
  }

  private async removeAttendanceForYear(
    studentId: string,
    schoolYearId: string,
  ): Promise<void> {
    const attendance = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .innerJoinAndSelect('attendance.course', 'course')
      .innerJoin('course.courseInstance', 'courseInstance')
      .where('attendance.studentId = :studentId', { studentId })
      .andWhere('courseInstance.schoolYearId = :schoolYearId', { schoolYearId })
      .getMany();

    if (attendance.length > 0) {
      await this.attendanceRepository.remove(attendance);
    }
  }
}
