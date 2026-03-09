import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { In, MoreThan } from 'typeorm';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { SchoolYears } from './school_years.entity';
import { SchoolYearsRepository } from './school_years.repository';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { UpdateSchoolYearDto } from './dto/update-school-year.dto';
import { SchoolYearsQueryDto } from './dto/school-years-query.dto';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { StudentsRepository } from '../students/students.repository';
import { CompleteSchoolYearDto } from './dto/complete-school-year.dto';
import { Enrollments } from '../enrollments/enrollments.entity';
import { Students } from '../students/students.entity';

@Injectable()
export class SchoolYearsService {
  constructor(
    private readonly repository: SchoolYearsRepository,
    private readonly enrollmentsRepository: EnrollmentsRepository,
    private readonly studentsRepository: StudentsRepository,
  ) {}

  async findAll(query: SchoolYearsQueryDto): Promise<SchoolYears[]> {
    const qb = this.repository.createQueryBuilder('schoolYears');
    qb.where('1=1');

    if (query.active !== undefined) {
      qb.andWhere('schoolYears.isActive = :isActive', {
        isActive: query.active,
      });
    }

    if (query.name?.trim()) {
      qb.andWhere("schoolYears.name ILIKE :name ESCAPE '\\'", {
        name: this.buildNameSearch(query.name),
      });
    }

    qb.orderBy('schoolYears.yearStart', 'DESC');

    return qb.getMany();
  }

  async findOne(id: number): Promise<SchoolYears> {
    const schoolYear = await this.repository.findOne({
      where: { schoolYearId: id.toString() },
    });

    if (!schoolYear) {
      throw new NotFoundException('School year not found');
    }

    return schoolYear;
  }

  async create(dto: CreateSchoolYearDto): Promise<SchoolYears> {
    this.assertChronologicalOrder(
      dto.startDate,
      dto.endDate,
      'startDate',
      'endDate',
    );

    const entity = this.repository.create({
      name: dto.name,
      yearStart: dto.startDate,
      yearEnd: dto.endDate,
      isActive: dto.active,
    });

    try {
      return await this.repository.save(entity);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'A school year with this name already exists',
      );
    }
  }

  async update(id: number, dto: UpdateSchoolYearDto): Promise<SchoolYears> {
    const schoolYear = await this.findOne(id);

    const start = dto.startDate ?? schoolYear.yearStart;
    const end = dto.endDate ?? schoolYear.yearEnd;

    this.assertChronologicalOrder(
      start,
      end,
      dto.startDate ? 'startDate' : 'yearStart',
      dto.endDate ? 'endDate' : 'yearEnd',
    );

    this.repository.merge(schoolYear, {
      name: dto.name ?? schoolYear.name,
      yearStart: start,
      yearEnd: end,
      isActive: dto.active ?? schoolYear.isActive,
    });

    try {
      return await this.repository.save(schoolYear);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'A school year with this name already exists',
      );
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const schoolYear = await this.findOne(id);
    await this.repository.remove(schoolYear);
    return { deleted: true };
  }

  async rollover(
    dto: { name?: string; startDate: string; endDate: string },
    user: { role: string },
  ): Promise<{ previous: SchoolYears | null; current: SchoolYears }> {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Only administrators can rollover school years',
      );
    }

    this.assertChronologicalOrder(
      dto.startDate,
      dto.endDate,
      'startDate',
      'endDate',
    );

    return this.repository.manager.transaction(async (manager) => {
      const repo = manager.getRepository(SchoolYears);

      const previous = await repo.findOne({
        where: { isActive: true },
        order: { yearStart: 'DESC' },
      });

      if (previous) {
        previous.isActive = false;
        await repo.save(previous);
      }

      const nextName =
        dto.name?.trim() || this.deriveName(dto.startDate, dto.endDate);
      const nextYear = repo.create({
        name: nextName,
        yearStart: dto.startDate,
        yearEnd: dto.endDate,
        isActive: true,
      });

      let current: SchoolYears | null = null;
      try {
        current = await repo.save(nextYear);
      } catch (error) {
        DbErrorMapper.throwConflict(
          error,
          'A school year with this name already exists',
        );
      }

      const activeCount = await repo.count({ where: { isActive: true } });
      if (activeCount !== 1) {
        throw new ConflictException(
          'Exactly one active school year must exist after rollover',
        );
      }

      if (!current) {
        throw new ConflictException(
          'Failed to create the new active school year',
        );
      }

      return {
        previous: previous ?? null,
        current,
      };
    });
  }

  async lock(id: number, user: { role: string }): Promise<SchoolYears> {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Only administrators can lock school years');
    }

    const schoolYear = await this.findOne(id);
    schoolYear.isActive = false;
    return this.repository.save(schoolYear);
  }

  async completeYear(
    id: number,
    dto: CompleteSchoolYearDto,
    user: { role: string },
  ): Promise<{
    schoolYearId: number;
    nextSchoolYearId: number | null;
    closedAt: string;
    force: boolean;
    enrollmentsClosed: number;
    studentsPromoted: number;
    studentsGraduated: number;
    studentsAlreadyEnrolled: number;
  }> {
    if (user.role !== 'admin') {
      throw new ForbiddenException(
        'Only administrators can complete school years',
      );
    }

    const schoolYear = await this.findOne(id);
    const closingDate = this.resolveCalendarYearEnd(schoolYear.yearEnd);
    const now = new Date();
    const force = dto.force ?? false;

    if (!force && now < closingDate) {
      throw new ConflictException(
        'School year can only be completed after the last day of the calendar year',
      );
    }

    const enrollments = await this.enrollmentsRepository.find({
      where: { schoolYearId: schoolYear.schoolYearId, active: true },
    });

    // TODO: apply academic criteria for promotion once available.
    const toPromote = enrollments.filter((enrollment) => enrollment.gradeLevel < 11);
    const toGraduate = enrollments.filter((enrollment) => enrollment.gradeLevel >= 11);

    let nextSchoolYear: SchoolYears | null = null;
    if (toPromote.length > 0) {
      nextSchoolYear = await this.repository.findOne({
        where: { yearStart: MoreThan(schoolYear.yearEnd) },
        order: { yearStart: 'ASC' },
      });

      if (!nextSchoolYear) {
        throw new ConflictException(
          'Next school year not found. Create it before promoting students.',
        );
      }
    }

    return this.repository.manager.transaction(async (manager) => {
      const enrollmentRepo = manager.getRepository(Enrollments);
      const studentRepo = manager.getRepository(Students);
      const schoolYearRepo = manager.getRepository(SchoolYears);

      const enrollmentIds = enrollments.map((enrollment) => enrollment.enrollmentId);
      if (enrollmentIds.length > 0) {
        await enrollmentRepo.update(
          { enrollmentId: In(enrollmentIds) },
          { active: false },
        );
      }

      let studentsPromoted = 0;
      let studentsAlreadyEnrolled = 0;

      if (nextSchoolYear && toPromote.length > 0) {
        const promoteStudentIds = toPromote.map((enrollment) => enrollment.studentId);
        const existingNext = await enrollmentRepo.find({
          where: {
            schoolYearId: nextSchoolYear.schoolYearId,
            studentId: In(promoteStudentIds),
            active: true,
          },
        });
        const existingSet = new Set(
          existingNext.map((enrollment) => enrollment.studentId),
        );

        const newEnrollments = toPromote
          .filter((enrollment) => !existingSet.has(enrollment.studentId))
          .map((enrollment) =>
            enrollmentRepo.create({
              studentId: enrollment.studentId,
              classGroupId: null,
              gradeLevel: enrollment.gradeLevel + 1,
              schoolYearId: nextSchoolYear!.schoolYearId,
              active: true,
            }),
          );

        if (newEnrollments.length > 0) {
          await enrollmentRepo.save(newEnrollments);
        }

        studentsPromoted = newEnrollments.length;
        studentsAlreadyEnrolled = toPromote.length - newEnrollments.length;
      }

      if (toGraduate.length > 0) {
        const graduateIds = Array.from(
          new Set(toGraduate.map((enrollment) => enrollment.studentId)),
        );
        await studentRepo.update(
          { studentId: In(graduateIds) },
          { isActive: false },
        );
      }

      if (schoolYear.isActive) {
        await schoolYearRepo.update(
          { schoolYearId: schoolYear.schoolYearId },
          { isActive: false },
        );
      }

      if (nextSchoolYear && !nextSchoolYear.isActive) {
        await schoolYearRepo.update(
          { schoolYearId: nextSchoolYear.schoolYearId },
          { isActive: true },
        );
      }

      return {
        schoolYearId: Number(schoolYear.schoolYearId),
        nextSchoolYearId: nextSchoolYear
          ? Number(nextSchoolYear.schoolYearId)
          : null,
        closedAt: now.toISOString(),
        force,
        enrollmentsClosed: enrollments.length,
        studentsPromoted,
        studentsGraduated: toGraduate.length,
        studentsAlreadyEnrolled,
      };
    });
  }

  private assertChronologicalOrder(
    startDate: string,
    endDate: string,
    startKey: string,
    endKey: string,
  ): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException(
        `Invalid date values for ${startKey} or ${endKey}`,
      );
    }

    if (start >= end) {
      throw new BadRequestException(
        'School year startDate must be before endDate',
      );
    }
  }

  private resolveCalendarYearEnd(yearEnd: string): Date {
    const end = new Date(yearEnd);
    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException('School year end date is invalid');
    }
    return new Date(Date.UTC(end.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
  }

  private buildNameSearch(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) {
      return '%%';
    }

    const escaped = trimmed.replace(/[%_]/g, (match) => `\\${match}`);
    return `%${escaped}%`;
  }

  private deriveName(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return `${startDate}-${endDate}`;
    }

    const startYear = start.getUTCFullYear();
    const endYear = end.getUTCFullYear();

    return startYear === endYear ? `${startYear}` : `${startYear}-${endYear}`;
  }
}
