import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Brackets, In, IsNull } from 'typeorm';
import { Classrooms } from '../classrooms/classrooms.entity';
import { ClassroomsRepository } from '../classrooms/classrooms.repository';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { SchoolYears } from '../school_years/school_years.entity';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { ClassGroups } from './class_groups.entity';
import { ClassGroupsRepository } from './class_groups.repository';
import { QueryClassGroupDto } from './dto/query-class-group.dto';
import { CreateClassGroupDto } from './dto/create-class-group.dto';
import { UpdateClassGroupDto } from './dto/update-class-group.dto';
import { AutoAssignClassGroupsDto } from './dto/auto-assign-class-groups.dto';
import { EnrollmentsRepository } from '../enrollments/enrollments.repository';
import { Enrollments } from '../enrollments/enrollments.entity';
import {
  buildPaginationResult,
  PaginatedResult,
  resolvePagination,
} from '../shared/pagination';

export type ClassGroupResponse = {
  classGroupId: number;
  schoolYearId: number;
  gradeLevel: number;
  section: string;
  code: string;
  defaultClassroomId?: number;
  createdAt?: Date | null;
};

export type AutoAssignSectionsResponse = {
  gradeLevel: number;
  schoolYearId: number;
  sectionsCreated: number;
  studentsAssigned: number;
  sectionSizes: number[];
  groups: ClassGroupResponse[];
};

const DEFAULT_SECTION_CAPACITY = 20;

@Injectable()
export class ClassGroupsService {
  constructor(
    private readonly classGroupsRepository: ClassGroupsRepository,
    private readonly schoolYearsRepository: SchoolYearsRepository,
    private readonly classroomsRepository: ClassroomsRepository,
    private readonly enrollmentsRepository: EnrollmentsRepository,
  ) {}

  async findAll(
    query: QueryClassGroupDto,
  ): Promise<PaginatedResult<ClassGroupResponse>> {
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

    if (query.q?.trim()) {
      const keyword = `%${query.q.trim().replace(/[%_]/g, (match) => `\\${match}`)}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub.where("classGroups.section ILIKE :keyword ESCAPE \\'", {
            keyword,
          });
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
        'Class group already exists for year/grade/section',
      );
    }
  }

  async update(
    id: number,
    dto: UpdateClassGroupDto,
  ): Promise<ClassGroupResponse> {
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
      entity.classroom = await this.getClassroomOrThrow(dto.defaultClassroomId);
    }

    try {
      const saved = await this.classGroupsRepository.save(entity);
      return this.findOne(Number(saved.classGroupId));
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Class group already exists for year/grade/section',
      );
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const entity = await this.getClassGroupEntity(id);
    await this.classGroupsRepository.remove(entity);
    return { deleted: true };
  }

  async autoAssignSections(
    dto: AutoAssignClassGroupsDto,
  ): Promise<AutoAssignSectionsResponse> {
    await this.resolveSchoolYear(dto.schoolYearId);

    const existingGroups = await this.classGroupsRepository.find({
      where: {
        schoolYearId: dto.schoolYearId.toString(),
        gradeLevel: dto.gradeLevel,
      },
    });

    if (existingGroups.length > 0) {
      throw new ConflictException(
        'Class groups already exist for this grade and school year',
      );
    }

    const enrollments = await this.enrollmentsRepository.find({
      where: {
        schoolYearId: dto.schoolYearId.toString(),
        gradeLevel: dto.gradeLevel,
        classGroupId: IsNull(),
        active: true,
      },
      relations: { student: true },
    });

    if (enrollments.length === 0) {
      throw new NotFoundException(
        'No pending enrollments found for this grade',
      );
    }

    const usedClassrooms = await this.classGroupsRepository.find({
      where: { schoolYearId: dto.schoolYearId.toString() },
      relations: { classroom: true },
    });

    const usedClassroomIds = new Set(
      usedClassrooms
        .map((group) => group.classroom?.classroomId)
        .filter((id): id is string => Boolean(id)),
    );

    const classrooms = await this.classroomsRepository.find({
      order: { capacity: 'DESC', name: 'ASC' },
    });

    const availableClassrooms = classrooms.filter(
      (classroom) => !usedClassroomIds.has(classroom.classroomId),
    );

    if (availableClassrooms.length === 0) {
      throw new ConflictException(
        'No available classrooms to create sections',
      );
    }

    const desiredSections = Math.ceil(
      enrollments.length / DEFAULT_SECTION_CAPACITY,
    );
    const sectionsCount = Math.min(
      desiredSections,
      availableClassrooms.length,
    );

    const selectedClassrooms = availableClassrooms.slice(0, sectionsCount);
    const sectionCodes = this.buildSectionCodes(
      new Set(),
      sectionsCount,
    );

    // TODO: balance sections by gender once student gender is available.
    const shuffledEnrollments = this.shuffleEnrollments(enrollments);
    const buckets = Array.from({ length: sectionsCount }, () => [] as Enrollments[]);

    shuffledEnrollments.forEach((enrollment, index) => {
      buckets[index % sectionsCount].push(enrollment);
    });

    const response = await this.enrollmentsRepository.manager.transaction(
      async (manager) => {
        const classGroupRepo = manager.getRepository(ClassGroups);
        const enrollmentRepo = manager.getRepository(Enrollments);
        const createdGroups: ClassGroups[] = [];

        for (let index = 0; index < sectionsCount; index += 1) {
          const section = sectionCodes[index];
          const classroom = selectedClassrooms[index];
          const group = classGroupRepo.create({
            schoolYearId: dto.schoolYearId.toString(),
            gradeLevel: dto.gradeLevel,
            section,
            classroom,
          });
          const savedGroup = await classGroupRepo.save(group);
          createdGroups.push(savedGroup);

          const bucket = buckets[index];
          if (bucket.length > 0) {
            const enrollmentIds = bucket.map((item) => item.enrollmentId);
            await enrollmentRepo.update(
              { enrollmentId: In(enrollmentIds) },
              { classGroupId: savedGroup.classGroupId },
            );
          }
        }

        return createdGroups;
      },
    );

    return {
      gradeLevel: dto.gradeLevel,
      schoolYearId: dto.schoolYearId,
      sectionsCreated: sectionsCount,
      studentsAssigned: enrollments.length,
      sectionSizes: buckets.map((bucket) => bucket.length),
      groups: response.map((group) => this.toResponse(group)),
    };
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

  private buildSectionCodes(existing: Set<string>, count: number): string[] {
    const sections: string[] = [];
    let index = 1;
    while (sections.length < count) {
      const code = String(index).padStart(2, '0');
      if (!existing.has(code)) {
        sections.push(code);
      }
      index += 1;
    }
    return sections;
  }

  private shuffleEnrollments(enrollments: Enrollments[]): Enrollments[] {
    const result = [...enrollments];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
