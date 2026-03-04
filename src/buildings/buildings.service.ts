import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Brackets } from 'typeorm';
import { DbErrorMapper } from '../shared/db-error.mapper';
import {
  buildPaginationResult,
  PaginatedResult,
  resolvePagination,
} from '../shared/pagination';
import { ClassroomsRepository } from '../classrooms/classrooms.repository';
import { Buildings } from './buildings.entity';
import { BuildingsRepository } from './buildings.repository';
import { CreateBuildingDto } from './dto/create-building.dto';
import { QueryBuildingDto } from './dto/query-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

export type BuildingResponse = {
  buildingId: number;
  name: string;
  isLab: boolean;
  isAuditorium: boolean;
  isComputerRoom: boolean;
  createdAt: Date | null;
};

@Injectable()
export class BuildingsService {
  constructor(
    private readonly repository: BuildingsRepository,
    private readonly classroomsRepository: ClassroomsRepository,
  ) {}

  async findAll(
    query: QueryBuildingDto,
  ): Promise<PaginatedResult<BuildingResponse>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);

    const qb = this.repository
      .createQueryBuilder('buildings')
      .orderBy('buildings.name', 'ASC');

    if (query.q?.trim()) {
      const keyword = `%${query.q.trim().replace(/[%_]/g, (m) => `\\${m}`)}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub.where("buildings.name ILIKE :keyword ESCAPE \\'", { keyword });
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

  async findOne(id: number): Promise<BuildingResponse> {
    const entity = await this.repository.findOne({
      where: { buildingId: id.toString() },
    });

    if (!entity) {
      throw new NotFoundException('Building not found');
    }

    return this.toResponse(entity);
  }

  async create(dto: CreateBuildingDto): Promise<BuildingResponse> {
    const entity = this.repository.create({
      name: dto.name,
      isLab: dto.isLab ?? false,
      isAuditorium: dto.isAuditorium ?? false,
      isComputerRoom: dto.isComputerRoom ?? false,
    });

    try {
      const saved = await this.repository.save(entity);
      return this.findOne(Number(saved.buildingId));
    } catch (error) {
      DbErrorMapper.throwConflict(error, 'Building already exists');
    }
  }

  async update(
    id: number,
    dto: UpdateBuildingDto,
  ): Promise<BuildingResponse> {
    const entity = await this.getEntity(id);

    if (dto.name !== undefined) {
      entity.name = dto.name;
    }
    if (dto.isLab !== undefined) {
      entity.isLab = dto.isLab;
    }
    if (dto.isAuditorium !== undefined) {
      entity.isAuditorium = dto.isAuditorium;
    }
    if (dto.isComputerRoom !== undefined) {
      entity.isComputerRoom = dto.isComputerRoom;
    }

    try {
      await this.repository.save(entity);
      return this.toResponse(entity);
    } catch (error) {
      DbErrorMapper.throwConflict(error, 'Building already exists');
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const entity = await this.getEntity(id);
    const count = await this.classroomsRepository.count({
      where: { buildingId: entity.buildingId },
    });
    if (count > 0) {
      throw new ConflictException(
        'Cannot delete building with assigned classrooms',
      );
    }
    await this.repository.remove(entity);
    return { deleted: true };
  }

  private async getEntity(id: number): Promise<Buildings> {
    const entity = await this.repository.findOne({
      where: { buildingId: id.toString() },
    });

    if (!entity) {
      throw new NotFoundException('Building not found');
    }

    return entity;
  }

  private toResponse(entity: Buildings): BuildingResponse {
    return {
      buildingId: Number(entity.buildingId),
      name: entity.name,
      isLab: entity.isLab ?? false,
      isAuditorium: entity.isAuditorium ?? false,
      isComputerRoom: entity.isComputerRoom ?? false,
      createdAt: entity.createdAt ?? null,
    };
  }
}
