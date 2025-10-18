import { Injectable, NotFoundException } from '@nestjs/common';
import { Classrooms } from '../classrooms/classrooms.entity';
import { ClassroomsRepository } from '../classrooms/classrooms.repository';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { SchoolYears } from '../school_years/school_years.entity';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { ClassGroups } from './class_groups.entity';
import { ClassGroupsRepository } from './class_groups.repository';
import { ClassGroupsQueryDto } from './dto/class-groups-query.dto';
import { CreateClassGroupDto } from './dto/create-class-group.dto';
import { UpdateClassGroupDto } from './dto/update-class-group.dto';
import { buildPaginationResult, PaginatedResult, resolvePagination } from '../shared/pagination';

export type ClassGroupResponse = {
  classGroupId: number;
  schoolYearId: number;
  gradeLevel: number;
  section: string;
  code: string;
  defaultClassroomId?: number;
  createdAt?: Date | null;
};

@Injectable()
export class ClassGroupsService {
  constructor(
    private readonly classGroupsRepository: ClassGroupsRepository,
    private readonly schoolYearsRepository: SchoolYearsRepository,
    private readonly classroomsRepository: ClassroomsRepository,
  ) {}

  async findAll(query: ClassGroupsQueryDto): Promise<PaginatedResult<ClassGroupResponse>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);

    const qb = this.classGroupsRepository
      .createQueryBuilder('classGroups')
      .leftJoinAndSelect('classGroups.classroom', 'classroom')
      .orderBy('classGroups.gradeLevel', 'ASC')
      .addOrderBy('classGroups.section', 'ASC');

    if (query.schoolYearId !== undefined) {
      qb.andWhere('classGroups.schoolYearId = :schoolYearId', {
        schoolYearId: query.schoolYearId.toString(),
      });
    }

    if (query.gradeLevel !== undefined) {
      qb.andWhere('classGroups.gradeLevel = :gradeLevel', {
        gradeLevel: query.gradeLevel,
      });
    }

    if (query.section !== undefined) {
      qb.andWhere('classGroups.section = :section', {
        section: query.section,
      });
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

  async findOne(id: number): Promise<ClassGroupResponse> {
    const entity = await this.classGroupsRepository.findOne({
      where: { classGroupId: id.toString() },
      relations: { classroom: true },
    });

    if (!entity) {
      throw new NotFoundException('Class group not found');
    }

    return this.toResponse(entity);
  }

  async create(dto: CreateClassGroupDto): Promise<ClassGroupResponse> {
    await this.resolveSchoolYear(dto.schoolYearId);
    const classroom =
      dto.defaultClassroomId !== undefined
        ? await this.getClassroomOrThrow(dto.defaultClassroomId)
        : undefined;

    const entity = this.classGroupsRepository.create({
      schoolYearId: dto.schoolYearId.toString(),
      gradeLevel: dto.gradeLevel,
      section: dto.section,
    });

    if (classroom) {
      entity.classroom = classroom;
    }

    try {
      const saved = await this.classGroupsRepository.save(entity);
      return this.findOne(Number(saved.classGroupId));
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'A class group with this school year, grade, and section already exists',
      );
    }
  }

  async update(id: number, dto: UpdateClassGroupDto): Promise<ClassGroupResponse> {
    const entity = await this.getClassGroupEntity(id);

    if (dto.schoolYearId !== undefined) {
      await this.resolveSchoolYear(dto.schoolYearId);
      entity.schoolYearId = dto.schoolYearId.toString();
    }

    if (dto.gradeLevel !== undefined) {
      entity.gradeLevel = dto.gradeLevel;
    }

    if (dto.section !== undefined) {
      entity.section = dto.section;
    }

    if (dto.defaultClassroomId !== undefined) {
      const classroom = await this.getClassroomOrThrow(dto.defaultClassroomId);
      entity.classroom = classroom;
    }

    try {
      const saved = await this.classGroupsRepository.save(entity);
      return this.findOne(Number(saved.classGroupId));
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'A class group with this school year, grade, and section already exists',
      );
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const entity = await this.getClassGroupEntity(id);
    await this.classGroupsRepository.remove(entity);
    return { deleted: true };
  }

  private async getClassGroupEntity(id: number): Promise<ClassGroups> {
    const entity = await this.classGroupsRepository.findOne({
      where: { classGroupId: id.toString() },
      relations: { classroom: true },
    });

    if (!entity) {
      throw new NotFoundException('Class group not found');
    }

    return entity;
  }

  private async resolveSchoolYear(id: number): Promise<SchoolYears> {
    const schoolYear = await this.schoolYearsRepository.findOne({
      where: { schoolYearId: id.toString() },
    });

    if (!schoolYear) {
      throw new NotFoundException('School year not found');
    }

    return schoolYear;
  }

  private async getClassroomOrThrow(id: number): Promise<Classrooms> {
    const classroom = await this.classroomsRepository.findOne({
      where: { classroomId: id.toString() },
    });

    if (!classroom) {
      throw new NotFoundException('Default classroom not found');
    }

    return classroom;
  }

  private toResponse(entity: ClassGroups): ClassGroupResponse {
    return {
      classGroupId: Number(entity.classGroupId),
      schoolYearId: Number(entity.schoolYearId),
      gradeLevel: entity.gradeLevel,
      section: entity.section,
      code: `${entity.gradeLevel}${entity.section}`,
      defaultClassroomId: entity.classroom
        ? Number(entity.classroom.classroomId)
        : undefined,
      createdAt: entity.createdAt,
    };
  }

}
