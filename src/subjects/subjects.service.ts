import { Injectable, NotFoundException } from '@nestjs/common';
import { Brackets } from 'typeorm';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { SubjectAreasRepository } from '../subject_areas/subject_areas.repository';
import { Subjects } from './subjects.entity';
import { SubjectsRepository } from './subjects.repository';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectsQueryDto } from './dto/subjects-query.dto';
import {
  buildPaginationResult,
  PaginatedResult,
  resolvePagination,
} from '../shared/pagination';

@Injectable()
export class SubjectsService {
  constructor(
    private readonly repository: SubjectsRepository,
    private readonly subjectAreasRepository: SubjectAreasRepository,
  ) {}

  async findAll(query: SubjectsQueryDto): Promise<PaginatedResult<Subjects>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);
    const qb = this.repository.createQueryBuilder('subjects');
    qb.where('1=1');

    if (query.q?.trim()) {
      const keyword = this.buildSearchKeyword(query.q);
      qb.andWhere(
        new Brackets((searchQb) => {
          searchQb
            .where("subjects.subject_code ILIKE :keyword ESCAPE '\\'")
            .orWhere("subjects.name ILIKE :keyword ESCAPE '\\'");
        }),
      ).setParameter('keyword', keyword);
    }

    if (query.areaId) {
      qb.andWhere('subjects.area_id = :areaId', {
        areaId: query.areaId.toString(),
      });
    }

    qb.orderBy('subjects.created_at', 'DESC');
    qb.skip((page - 1) * pageSize);
    qb.take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginationResult(data, total, page, pageSize);
  }

  async findOne(id: number): Promise<Subjects> {
    const subject = await this.repository.findOne({
      where: { subjectId: id.toString() },
      relations: { area: true },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }

  async create(dto: CreateSubjectDto): Promise<Subjects> {
    const area = await this.subjectAreasRepository.findOne({
      where: { areaId: dto.areaId.toString() },
    });

    if (!area) {
      throw new NotFoundException('Subject area not found');
    }

    const entity = this.repository.create({
      subjectCode: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      area,
    });

    try {
      return await this.repository.save(entity);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Subject with this code already exists',
      );
    }
  }

  async update(id: number, dto: UpdateSubjectDto): Promise<Subjects> {
    const subject = await this.findOne(id);

    if (
      dto.areaId !== undefined &&
      (!subject.area || subject.area.areaId !== dto.areaId.toString())
    ) {
      const area = await this.subjectAreasRepository.findOne({
        where: { areaId: dto.areaId.toString() },
      });

      if (!area) {
        throw new NotFoundException('Subject area not found');
      }

      subject.area = area;
    }

    if (dto.code !== undefined) {
      subject.subjectCode = dto.code;
    }
    if (dto.name !== undefined) {
      subject.name = dto.name;
    }
    if (dto.description !== undefined) {
      subject.description = dto.description;
    }

    try {
      return await this.repository.save(subject);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Subject with this code already exists',
      );
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const subject = await this.findOne(id);
    await this.repository.remove(subject);
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
