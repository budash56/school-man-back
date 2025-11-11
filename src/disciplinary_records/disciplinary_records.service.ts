import { Injectable, NotFoundException } from '@nestjs/common';
import { Brackets } from 'typeorm';
import { DisciplinaryRecordsRepository } from './disciplinary_records.repository';
import { StudentsRepository } from '../students/students.repository';
import { UsersRepository } from '../users/users.repository';
import { QueryDisciplinaryRecordDto } from './dto/query-disciplinary-record.dto';
import { CreateDisciplinaryRecordDto } from './dto/create-disciplinary-record.dto';
import { UpdateDisciplinaryRecordDto } from './dto/update-disciplinary-record.dto';
import {
  buildPaginationResult,
  PaginatedResult,
  resolvePagination,
} from '../shared/pagination';
import { DisciplinaryRecords } from './disciplinary_records.entity';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { Users } from '../users/users.entity';
import { Students } from '../students/students.entity';

export type DisciplinaryRecordResponse = {
  disciplinaryId: number;
  studentId: number;
  recordedBy: string | null;
  dateHappened: string;
  category: 'green' | 'yellow' | 'red' | 'last_notice';
  description: string | null;
  expiresAt: string | null;
  createdAt: string | null;
};

@Injectable()
export class DisciplinaryRecordsService {
  constructor(
    private readonly repository: DisciplinaryRecordsRepository,
    private readonly studentsRepository: StudentsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async findAll(
    query: QueryDisciplinaryRecordDto,
  ): Promise<PaginatedResult<DisciplinaryRecordResponse>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);

    const qb = this.repository
      .createQueryBuilder('records')
      .leftJoinAndSelect('records.student', 'student')
      .leftJoinAndSelect('records.recordedBy', 'user')
      .orderBy('records.dateHappened', 'DESC')
      .addOrderBy('records.disciplinaryId', 'DESC');

    if (query.studentId !== undefined) {
      qb.andWhere('records.studentId = :studentId', {
        studentId: query.studentId.toString(),
      });
    }

    if (query.recordedBy?.trim()) {
      qb.andWhere('records.recordedBy = :recordedBy', {
        recordedBy: query.recordedBy.trim(),
      });
    }

    if (query.category !== undefined) {
      qb.andWhere('records.category = :category', { category: query.category });
    }

    if (query.from) {
      qb.andWhere('records.dateHappened >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('records.dateHappened <= :to', { to: query.to });
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

  async findOne(id: number): Promise<DisciplinaryRecordResponse> {
    const entity = await this.repository.findOne({
      where: { disciplinaryId: id.toString() },
      relations: { student: true, recordedBy: true },
    });

    if (!entity) {
      throw new NotFoundException('Disciplinary record not found');
    }

    return this.toResponse(entity);
  }

  async create(
    dto: CreateDisciplinaryRecordDto,
  ): Promise<DisciplinaryRecordResponse> {
    const student = await this.resolveStudent(dto.studentId);
    const recordedBy = await this.resolveUser(dto.recordedBy);

    const entity = this.repository.create({
      student,
      recordedBy,
      dateHappened: dto.dateHappened,
      category: dto.category,
      description: dto.description ?? null,
      expiresAt: dto.expiresAt ?? null,
    });

    try {
      const saved = await this.repository.save(entity);
      return this.findOne(Number(saved.disciplinaryId));
    } catch (error) {
      DbErrorMapper.throwConflict(error, 'Disciplinary record already exists');
    }
  }

  async update(
    id: number,
    dto: UpdateDisciplinaryRecordDto,
  ): Promise<DisciplinaryRecordResponse> {
    const entity = await this.getEntity(id);

    if (dto.studentId !== undefined) {
      entity.student = await this.resolveStudent(dto.studentId);
    }

    if (dto.recordedBy !== undefined) {
      entity.recordedBy = await this.resolveUser(dto.recordedBy);
    }

    if (dto.dateHappened !== undefined) {
      entity.dateHappened = dto.dateHappened;
    }

    if (dto.category !== undefined) {
      entity.category = dto.category;
    }

    if (dto.description !== undefined) {
      entity.description = dto.description ?? null;
    }

    if (dto.expiresAt !== undefined) {
      entity.expiresAt = dto.expiresAt ?? null;
    }

    try {
      const saved = await this.repository.save(entity);
      return this.toResponse(saved);
    } catch (error) {
      DbErrorMapper.throwConflict(error, 'Disciplinary record already exists');
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const entity = await this.getEntity(id);
    await this.repository.remove(entity);
    return { deleted: true };
  }

  private async getEntity(id: number): Promise<DisciplinaryRecords> {
    const entity = await this.repository.findOne({
      where: { disciplinaryId: id.toString() },
      relations: { student: true, recordedBy: true },
    });

    if (!entity) {
      throw new NotFoundException('Disciplinary record not found');
    }

    return entity;
  }

  private async resolveStudent(id: number): Promise<Students> {
    const student = await this.studentsRepository.findOne({
      where: { studentId: id.toString() },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  private async resolveUser(nationalId: string): Promise<Users> {
    const user = await this.usersRepository.findOne({
      where: { nationalId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private toResponse(entity: DisciplinaryRecords): DisciplinaryRecordResponse {
    return {
      disciplinaryId: Number(entity.disciplinaryId),
      studentId: Number(entity.student?.studentId ?? 0),
      recordedBy: entity.recordedBy?.nationalId ?? null,
      dateHappened: entity.dateHappened,
      category: entity.category,
      description: entity.description ?? null,
      expiresAt: entity.expiresAt ?? null,
      createdAt: entity.createdAt ? entity.createdAt.toISOString() : null,
    };
  }
}
