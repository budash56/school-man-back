import { Injectable, NotFoundException } from '@nestjs/common';
import { Brackets, In } from 'typeorm';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { SubjectAreas } from './subject_areas.entity';
import { SubjectAreasRepository } from './subject_areas.repository';
import { CreateSubjectAreaDto } from './dto/create-subject-area.dto';
import { UpdateSubjectAreaDto } from './dto/update-subject-area.dto';
import { SubjectAreasQueryDto } from './dto/subject-areas-query.dto';
import {
  buildPaginationResult,
  PaginatedResult,
  resolvePagination,
} from '../shared/pagination';

@Injectable()
export class SubjectAreasService {
  constructor(private readonly repository: SubjectAreasRepository) {}

  async findAll(
    query: SubjectAreasQueryDto,
  ): Promise<PaginatedResult<SubjectAreas>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);
    const qb = this.repository.createQueryBuilder('subjectAreas');

    qb.orderBy('subjectAreas.name', 'ASC');

    if (query.q?.trim()) {
      const keyword = this.buildSearchKeyword(query.q);
      qb.where(
        new Brackets((searchQb) => {
          searchQb
            .where("subjectAreas.code ILIKE :keyword ESCAPE '\\'")
            .orWhere("subjectAreas.name ILIKE :keyword ESCAPE '\\'");
        }),
      ).setParameter('keyword', keyword);
    }

    qb.skip((page - 1) * pageSize);
    qb.take(pageSize);

    const [data, total] = await qb.getManyAndCount();

    if (query.includeSubjects && data.length > 0) {
      const ids = data.map((area) => area.areaId);
      const withSubjects = await this.repository.find({
        where: { areaId: In(ids) },
        relations: { subjects: true },
        order: { name: 'ASC' },
      });
      const mapped = new Map(
        withSubjects.map((area) => [area.areaId, area]),
      );
      const merged = data.map((area) => mapped.get(area.areaId) ?? area);
      return buildPaginationResult(merged, total, page, pageSize);
    }

    return buildPaginationResult(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<SubjectAreas> {
    const area = await this.repository.findOne({
      where: { areaId: id.toString() },
    });

    if (!area) {
      throw new NotFoundException('Subject area not found');
    }

    return area;
  }

  async create(dto: CreateSubjectAreaDto): Promise<SubjectAreas> {
    const entity = this.repository.create({
      code: dto.code,
      name: dto.name,
      isSpecialization: dto.isSpecialization ?? false,
    });

    try {
      return await this.repository.save(entity);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Subject area with this code or name already exists',
      );
    }
  }

  async update(id: number, dto: UpdateSubjectAreaDto): Promise<SubjectAreas> {
    const area = await this.findOne(id);
    this.repository.merge(area, dto);

    try {
      return await this.repository.save(area);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Subject area with this code or name already exists',
      );
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const area = await this.findOne(id);
    await this.repository.remove(area);
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
}
