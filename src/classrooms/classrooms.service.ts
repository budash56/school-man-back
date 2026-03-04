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
import { BuildingsRepository } from '../buildings/buildings.repository';

export type ClassroomResponse = {
  classroomId: number;
  name: string;
  buildingId: number | null;
  building: {
    buildingId: number;
    name: string;
  } | null;
  capacity: number;
  createdAt: Date | null;
};

@Injectable()
export class ClassroomsService {
  constructor(
    private readonly repository: ClassroomsRepository,
    private readonly buildingsRepository: BuildingsRepository,
  ) {}

  async findAll(
    query: QueryClassroomDto,
  ): Promise<PaginatedResult<ClassroomResponse>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);

    const qb = this.repository
      .createQueryBuilder('classrooms')
      .leftJoinAndSelect('classrooms.building', 'building')
      .orderBy('classrooms.name', 'ASC');

    if (query.buildingId) {
      qb.andWhere('classrooms.building_id = :buildingId', {
        buildingId: query.buildingId.toString(),
      });
    } else if (query.building?.trim()) {
      const keyword = `%${query.building.trim().replace(/[%_]/g, (m) => `\\${m}`)}%`;
      qb.andWhere("building.name ILIKE :building ESCAPE \\'", {
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
      relations: { building: true },
    });

    if (!entity) {
      throw new NotFoundException('Classroom not found');
    }

    return this.toResponse(entity);
  }

  async create(dto: CreateClassroomDto): Promise<ClassroomResponse> {
    const building = await this.buildingsRepository.findOne({
      where: { buildingId: dto.buildingId.toString() },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    const name = await this.generateClassroomName(
      building.buildingId,
      building.name,
    );

    const entity = this.repository.create({
      name,
      buildingId: building.buildingId,
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

    if (dto.buildingId !== undefined) {
      const building = await this.buildingsRepository.findOne({
        where: { buildingId: dto.buildingId.toString() },
      });
      if (!building) {
        throw new NotFoundException('Building not found');
      }
      const buildingChanged = entity.buildingId !== building.buildingId;
      entity.buildingId = building.buildingId;
      if (buildingChanged) {
        entity.name = await this.generateClassroomName(
          building.buildingId,
          building.name,
        );
      }
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
      relations: { building: true },
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
      building: entity.building
        ? {
            buildingId: Number(entity.building.buildingId),
            name: entity.building.name,
          }
        : null,
      buildingId: entity.buildingId ? Number(entity.buildingId) : null,
      capacity: entity.capacity,
      createdAt: entity.createdAt ?? null,
    };
  }

  private async generateClassroomName(
    buildingId: string,
    buildingName: string,
  ): Promise<string> {
    const rawPrefix =
      buildingName && buildingName.trim().length > 0
        ? buildingName.trim()
        : 'Building';
    const sanitized = rawPrefix.replace(/[^a-zA-Z0-9]/g, '');
    const basePrefix = sanitized.length > 0 ? sanitized : 'Building';
    const maxPrefixLength = 80 - '_Aula'.length - 2;
    const prefix = basePrefix.slice(0, Math.max(1, maxPrefixLength));
    const regex = new RegExp(`^${this.escapeRegex(prefix)}_Aula(\\d+)$`);

    const existing = await this.repository.find({
      where: { buildingId },
      select: ['name'],
    });

    const used = new Set<number>();
    existing.forEach((room) => {
      const match = regex.exec(room.name);
      if (match) {
        const value = parseInt(match[1], 10);
        if (Number.isFinite(value) && value > 0) {
          used.add(value);
        }
      }
    });

    let next = 1;
    while (used.has(next)) {
      next += 1;
    }

    const suffix = String(next).padStart(2, '0');
    return `${prefix}_Aula${suffix}`;
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
  }
}
