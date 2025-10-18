import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Brackets } from 'typeorm';
import { Students } from './students.entity';
import { StudentsRepository } from './students.repository';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsQueryDto } from './dto/students-query.dto';
import { buildPaginationResult, PaginatedResult, resolvePagination } from '../shared/pagination';

@Injectable()
export class StudentsService {
  constructor(private readonly repository: StudentsRepository) {}

  async findAll(query: StudentsQueryDto): Promise<PaginatedResult<Students>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);
    const qb = this.repository.createQueryBuilder('students');

    qb.where('students.deleted_at IS NULL');

    if (query.q?.trim()) {
      const keyword = this.buildSearchKeyword(query.q);
      qb.andWhere(
        new Brackets((searchQb) => {
          searchQb
            .where('students.first_name ILIKE :keyword ESCAPE \'\\\'')
            .orWhere('students.last_name ILIKE :keyword ESCAPE \'\\\'')
            .orWhere('students.national_id ILIKE :keyword ESCAPE \'\\\'');
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

    qb.orderBy('students.created_at', 'DESC');
    qb.skip((page - 1) * pageSize);
    qb.take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginationResult(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<Students> {
    const student = await this.repository.findOne({
      where: { studentId: id.toString() },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }

  async create(dto: CreateStudentDto): Promise<Students> {
    await this.assertNationalIdAvailable(dto.nationalId);

    const entity = this.repository.create({
      nationalId: dto.nationalId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dob: dto.dob ?? null,
      address: dto.address ?? null,
      guardianName: dto.guardianName,
      guardianRelationship: dto.guardianRelationship,
      guardianPhone: dto.guardianPhone,
      isActive: true,
    });

    return this.repository.save(entity);
  }

  async update(id: number, dto: UpdateStudentDto): Promise<Students> {
    const student = await this.findOne(id);

    if (dto.nationalId && dto.nationalId !== student.nationalId) {
      await this.assertNationalIdAvailable(dto.nationalId, student.studentId);
    }

    this.repository.merge(student, {
      ...dto,
      dob: dto.dob ?? student.dob,
      address: dto.address ?? student.address,
    });

    return this.repository.save(student);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const student = await this.findOne(id);
    await this.repository.remove(student);
    return { deleted: true };
  }

  private buildSearchKeyword(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) {
      return '%%';
    }

    const escaped = trimmed.replace(/[%_]/g, (match) => `\\${match}`);
    return `%${escaped}%`;
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
      throw new ConflictException('A student with this national ID already exists');
    }
  }

}
