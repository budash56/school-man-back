import { Injectable, NotFoundException } from '@nestjs/common';
import { Brackets } from 'typeorm';
import { ClassroomsRepository } from './classrooms.repository';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { QueryClassroomDto } from './dto/query-classroom.dto';
import {
  buildPaginationResult,
  PaginatedResult,
  resolvePagination,
} from '../shared/pagination';
import { Classrooms } from './classrooms.entity';
import { DbErrorMapper } from '../shared/db-error.mapper';

export type ClassroomResponse = {
  classroomId: number;
  name: string;
  building: string | null;
  capacity: number;
  createdAt: Date | null;
};

@Injectable()
export class ClassroomsService {
  constructor(private readonly repository: ClassroomsRepository) {}

  async findAll(
    query: QueryClassroomDto,
  ): Promise<PaginatedResult<ClassroomResponse>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);

    const qb = this.repository
      .createQueryBuilder('classrooms')
      .orderBy('classrooms.name', 'ASC');

    if (query.building?.trim()) {
      const keyword = `%${query.building.trim().replace(/[%_]/g, (m) => `\\${m}`)}%`;
      qb.andWhere("classrooms.building ILIKE :building ESCAPE \\'", {
        building: keyword,
      });
    }

    if (query.q?.trim()) {
      const keyword = `%${query.q.trim().replace(/[%_]/g, (m) => `\\${m}`)}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub.where("classrooms.name ILIKE :keyword ESCAPE \\'", { keyword });
        }),
      );
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

  async findOne(id: number): Promise<ClassroomResponse> {
    const entity = await this.repository.findOne({
      where: { classroomId: id.toString() },
    });

    if (!entity) {
      throw new NotFoundException('Classroom not found');
    }

    return this.toResponse(entity);
  }

  async create(dto: CreateClassroomDto): Promise<ClassroomResponse> {
    const entity = this.repository.create({
      name: dto.name,
      building: dto.building ?? null,
      capacity: dto.capacity,
    });

    try {
      const saved = await this.repository.save(entity);
      return this.findOne(Number(saved.classroomId));
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Classroom with this name already exists',
      );
    }
  }

  async update(
    id: number,
    dto: UpdateClassroomDto,
  ): Promise<ClassroomResponse> {
    const entity = await this.getEntity(id);

    if (dto.name !== undefined) {
      entity.name = dto.name;
    }

    if (dto.building !== undefined) {
      entity.building = dto.building ?? null;
    }

    if (dto.capacity !== undefined) {
      entity.capacity = dto.capacity;
    }

    try {
      await this.repository.save(entity);
      return this.toResponse(entity);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Classroom with this name already exists',
      );
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const entity = await this.getEntity(id);
    await this.repository.remove(entity);
    return { deleted: true };
  }

  private async getEntity(id: number): Promise<Classrooms> {
    const entity = await this.repository.findOne({
      where: { classroomId: id.toString() },
    });

    if (!entity) {
      throw new NotFoundException('Classroom not found');
    }

    return entity;
  }

  private toResponse(entity: Classrooms): ClassroomResponse {
    return {
      classroomId: Number(entity.classroomId),
      name: entity.name,
      building: entity.building ?? null,
      capacity: entity.capacity,
      createdAt: entity.createdAt ?? null,
    };
  }
}
