import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Brackets } from 'typeorm';
import { DbErrorMapper } from '../database/db-error.mapper';
import { SchoolYears } from '../school_years/school_years.entity';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { Subjects } from '../subjects/subjects.entity';
import { SubjectsRepository } from '../subjects/subjects.repository';
import { CourseInstances } from './course_instances.entity';
import { CourseInstancesRepository } from './course_instances.repository';
import { CourseInstanceResponseDto } from './dto/course-instance-response.dto';
import { CourseInstancesQueryDto } from './dto/course-instances-query.dto';
import { CreateCourseInstanceDto } from './dto/create-course-instance.dto';
import { UpdateCourseInstanceDto } from './dto/update-course-instance.dto';

@Injectable()
export class CourseInstancesService {
  constructor(
    private readonly repository: CourseInstancesRepository,
    private readonly subjectsRepository: SubjectsRepository,
    private readonly schoolYearsRepository: SchoolYearsRepository,
  ) {}

  async findAll(query: CourseInstancesQueryDto): Promise<CourseInstanceResponseDto[]> {
    const qb = this.repository
      .createQueryBuilder('courseInstances')
      .leftJoinAndSelect('courseInstances.subject', 'subject')
      .leftJoinAndSelect('subject.area', 'area')
      .leftJoinAndSelect('courseInstances.schoolYear', 'schoolYear');

    qb.where('1=1');

    if (query.schoolYearId) {
      qb.andWhere('courseInstances.schoolYearId = :schoolYearId', {
        schoolYearId: query.schoolYearId.toString(),
      });
    }

    if (query.gradeLevel) {
      qb.andWhere('courseInstances.gradeLevel = :gradeLevel', {
        gradeLevel: query.gradeLevel,
      });
    }

    if (query.subjectId) {
      qb.andWhere('courseInstances.subjectId = :subjectId', {
        subjectId: query.subjectId.toString(),
      });
    }

    if (query.q?.trim()) {
      const keyword = this.buildSearchKeyword(query.q);
      qb.andWhere(
        new Brackets((searchQb) => {
          searchQb
            .where('courseInstances.courseCode ILIKE :keyword ESCAPE \'\\\'')
            .orWhere('courseInstances.courseName ILIKE :keyword ESCAPE \'\\\'');
        }),
      ).setParameter('keyword', keyword);
    }

    qb.orderBy('courseInstances.gradeLevel', 'ASC')
      .addOrderBy('subject.subjectCode', 'ASC')
      .addOrderBy('courseInstances.courseCode', 'ASC');

    const entities = await qb.getMany();
    return entities.map((courseInstance) => this.toResponseDto(courseInstance));
  }

  async findOne(id: number): Promise<CourseInstanceResponseDto> {
    const entity = await this.repository.findOne({
      where: { courseInstanceId: id.toString() },
      relations: ['subject', 'subject.area', 'schoolYear'],
    });

    if (!entity) {
      throw new NotFoundException('Course instance not found');
    }

    return this.toResponseDto(entity);
  }

  async create(dto: CreateCourseInstanceDto): Promise<CourseInstanceResponseDto> {
    this.assertGrade(dto.gradeLevel);
    const subject = await this.loadSubject(dto.subjectId);
    const schoolYear = await this.loadSchoolYear(dto.schoolYearId);

    const courseCode = dto.courseCode?.trim()
      ? dto.courseCode.trim()
      : this.generateCourseCode(subject.subjectCode, dto.gradeLevel, schoolYear.name);

    const entity = this.repository.create({
      subjectId: subject.subjectId,
      gradeLevel: dto.gradeLevel,
      schoolYearId: schoolYear.schoolYearId,
      weeklyHours: dto.weeklyHours ?? 0,
      courseCode,
      courseName: dto.courseName.trim(),
      isActive: dto.isActive ?? true,
    });

    try {
      const saved = await this.repository.save(entity);
      return this.findOne(parseInt(saved.courseInstanceId, 10));
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'A course instance with these identifiers already exists for the school year',
      );
    }
  }

  async update(id: number, dto: UpdateCourseInstanceDto): Promise<CourseInstanceResponseDto> {
    const entity = await this.repository.findOne({
      where: { courseInstanceId: id.toString() },
    });

    if (!entity) {
      throw new NotFoundException('Course instance not found');
    }

    const gradeLevel = dto.gradeLevel ?? entity.gradeLevel;
    this.assertGrade(gradeLevel);

    let subject = await this.loadSubject(Number.parseInt(entity.subjectId, 10));
    if (dto.subjectId !== undefined) {
      subject = await this.loadSubject(dto.subjectId);
    }

    let schoolYear = await this.loadSchoolYear(Number.parseInt(entity.schoolYearId, 10));
    if (dto.schoolYearId !== undefined) {
      schoolYear = await this.loadSchoolYear(dto.schoolYearId);
    }

    const courseCode =
      dto.courseCode?.trim() ??
      entity.courseCode ??
      this.generateCourseCode(subject.subjectCode, gradeLevel, schoolYear.name);

    this.repository.merge(entity, {
      subjectId: subject.subjectId,
      gradeLevel,
      schoolYearId: schoolYear.schoolYearId,
      weeklyHours: dto.weeklyHours ?? entity.weeklyHours ?? 0,
      courseCode,
      courseName: dto.courseName?.trim() ?? entity.courseName,
      isActive: dto.isActive ?? entity.isActive ?? true,
    });

    try {
      await this.repository.save(entity);
      return this.findOne(id);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'A course instance with these identifiers already exists for the school year',
      );
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const entity = await this.repository.findOne({
      where: { courseInstanceId: id.toString() },
    });

    if (!entity) {
      throw new NotFoundException('Course instance not found');
    }

    await this.repository.remove(entity);
    return { deleted: true };
  }

  private assertGrade(gradeLevel: number): void {
    if (gradeLevel < 1 || gradeLevel > 11) {
      throw new BadRequestException('gradeLevel must be between 1 and 11');
    }
  }

  private async loadSubject(id: number): Promise<Subjects> {
    const subject = await this.subjectsRepository.findOne({
      where: { subjectId: id.toString() },
      relations: ['area'],
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }

  private async loadSchoolYear(id: number): Promise<SchoolYears> {
    const schoolYear = await this.schoolYearsRepository.findOne({
      where: { schoolYearId: id.toString() },
    });

    if (!schoolYear) {
      throw new NotFoundException('School year not found');
    }

    return schoolYear;
  }

  private generateCourseCode(subjectCode: string, gradeLevel: number, yearName: string): string {
    return `${subjectCode}-${gradeLevel}-Y${yearName}`;
  }

  private buildSearchKeyword(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) {
      return '%%';
    }
    const escaped = trimmed.replace(/[%_]/g, (match) => `\\${match}`);
    return `%${escaped}%`;
  }

  private toResponseDto(entity: CourseInstances): CourseInstanceResponseDto {
    const courseInstanceId = Number.parseInt(entity.courseInstanceId, 10);
    const subject = entity.subject as Subjects | undefined;
    const schoolYear = entity.schoolYear as SchoolYears | undefined;
    const subjectId = Number.parseInt(entity.subjectId, 10);
    const schoolYearId = Number.parseInt(entity.schoolYearId, 10);

    return {
      courseInstanceId,
      subjectId,
      subjectCode: subject?.subjectCode ?? '',
      subjectAreaCode: subject?.area?.code ?? null,
      subjectName: subject?.name ?? '',
      gradeLevel: entity.gradeLevel,
      weeklyHours: entity.weeklyHours ?? 0,
      courseCode: entity.courseCode,
      courseName: entity.courseName,
      isActive: entity.isActive ?? true,
      schoolYearId,
      schoolYearName: schoolYear?.name ?? '',
    };
  }
}
