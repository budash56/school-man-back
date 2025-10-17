import { Injectable, NotFoundException } from '@nestjs/common';
import { Brackets } from 'typeorm';
import { DbErrorMapper } from '../database/db-error.mapper';
import { SubjectAreas } from './subject_areas.entity';
import { SubjectAreasRepository } from './subject_areas.repository';
import { CreateSubjectAreaDto } from './dto/create-subject-area.dto';
import { UpdateSubjectAreaDto } from './dto/update-subject-area.dto';
import {
  SubjectAreasQueryDto,
  SUBJECT_AREAS_DEFAULT_PAGE_SIZE,
  SUBJECT_AREAS_MAX_PAGE_SIZE,
} from './dto/subject-areas-query.dto';

type PaginationResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

@Injectable()
export class SubjectAreasService {
  constructor(private readonly repository: SubjectAreasRepository) {}

  async findAll(query: SubjectAreasQueryDto): Promise<PaginationResult<SubjectAreas>> {
    const page = this.resolvePage(query.page);
    const pageSize = this.resolvePageSize(query.pageSize);
    const qb = this.repository.createQueryBuilder('subjectAreas');

    qb.orderBy('subjectAreas.name', 'ASC');

    if (query.q?.trim()) {
      const keyword = this.buildSearchKeyword(query.q);
      qb.where(
        new Brackets((searchQb) => {
          searchQb
            .where('subjectAreas.code ILIKE :keyword ESCAPE \'\\\'')
            .orWhere('subjectAreas.name ILIKE :keyword ESCAPE \'\\\'');
        }),
      ).setParameter('keyword', keyword);
    }

    qb.skip((page - 1) * pageSize);
    qb.take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, pageSize };
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
    });

    try {
      return await this.repository.save(entity);
    } catch (error) {
      DbErrorMapper.throwConflict(error, 'Subject area with this code or name already exists');
    }
  }

  async update(id: number, dto: UpdateSubjectAreaDto): Promise<SubjectAreas> {
    const area = await this.findOne(id);
    this.repository.merge(area, dto);

    try {
      return await this.repository.save(area);
    } catch (error) {
      DbErrorMapper.throwConflict(error, 'Subject area with this code or name already exists');
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const area = await this.findOne(id);
    await this.repository.remove(area);
    return { deleted: true };
  }

  private resolvePage(rawPage?: number): number {
    if (!rawPage || rawPage < 1) {
      return 1;
    }
    return rawPage;
  }

  private resolvePageSize(rawPageSize?: number): number {
    if (!rawPageSize || rawPageSize < 1) {
      return SUBJECT_AREAS_DEFAULT_PAGE_SIZE;
    }
    return Math.min(rawPageSize, SUBJECT_AREAS_MAX_PAGE_SIZE);
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
