import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DbErrorMapper } from '../database/db-error.mapper';
import { SchoolYears } from '../school_years/school_years.entity';
import { SchoolYearsRepository } from '../school_years/school_years.repository';
import { Terms } from './terms.entity';
import { TermsRepository } from './terms.repository';
import { CreateTermDto } from './dto/create-term.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { TermsQueryDto } from './dto/terms-query.dto';
import { TermName, TERM_SORT_ORDER } from './dto/term-name.enum';

@Injectable()
export class TermsService {
  constructor(
    private readonly repository: TermsRepository,
    private readonly schoolYearsRepository: SchoolYearsRepository,
  ) {}

  async findAll(query: TermsQueryDto): Promise<Terms[]> {
    const qb = this.repository
      .createQueryBuilder('terms')
      .leftJoinAndSelect('terms.schoolYear', 'schoolYear');

    qb.where('1=1');

    if (query.active !== undefined) {
      qb.andWhere('schoolYear.isActive = :isActive', { isActive: query.active });
    }

    if (query.name) {
      qb.andWhere('terms.name = :name', { name: query.name });
    }

    if (query.schoolYearId) {
      qb.andWhere('terms.schoolYearId = :schoolYearId', {
        schoolYearId: query.schoolYearId.toString(),
      });
    }

    qb.orderBy('terms.sortOrder', 'ASC').addOrderBy('terms.startDate', 'ASC');

    return qb.getMany();
  }

  async findOne(id: number): Promise<Terms> {
    const term = await this.repository.findOne({
      where: { termId: id.toString() },
      relations: ['schoolYear'],
    });

    if (!term) {
      throw new NotFoundException('Term not found');
    }

    return term;
  }

  async create(dto: CreateTermDto): Promise<Terms> {
    const schoolYear = await this.loadSchoolYear(dto.schoolYearId);
    this.assertValidDateRange(dto.startDate, dto.endDate);
    this.assertWithinSchoolYear(dto.startDate, dto.endDate, schoolYear.yearStart, schoolYear.yearEnd);
    await this.assertNoOverlap(schoolYear.schoolYearId, dto.startDate, dto.endDate);

    const name = this.normalizeTermName(dto.name);
    const entity = this.repository.create({
      schoolYearId: schoolYear.schoolYearId,
      name,
      startDate: dto.startDate,
      endDate: dto.endDate,
      sortOrder: TERM_SORT_ORDER[name],
      isFinal: name === TermName.Final,
    });

    try {
      return await this.repository.save(entity);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'A term with this name already exists for the selected school year',
      );
    }
  }

  async update(id: number, dto: UpdateTermDto): Promise<Terms> {
    const term = await this.findOne(id);
    const targetSchoolYearId =
      dto.schoolYearId !== undefined ? dto.schoolYearId.toString() : term.schoolYearId;
    const schoolYear = await this.loadSchoolYear(parseInt(targetSchoolYearId, 10));

    const startDate = dto.startDate ?? term.startDate;
    const endDate = dto.endDate ?? term.endDate;

    this.assertValidDateRange(startDate, endDate);
    this.assertWithinSchoolYear(startDate, endDate, schoolYear.yearStart, schoolYear.yearEnd);
    await this.assertNoOverlap(targetSchoolYearId, startDate, endDate, term.termId);

    const nextName = this.normalizeTermName(dto.name ?? term.name);

    this.repository.merge(term, {
      schoolYearId: targetSchoolYearId,
      name: nextName,
      startDate,
      endDate,
      sortOrder: TERM_SORT_ORDER[nextName],
      isFinal: nextName === TermName.Final,
    });

    try {
      return await this.repository.save(term);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'A term with this name already exists for the selected school year',
      );
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const term = await this.findOne(id);
    await this.repository.remove(term);
    return { deleted: true };
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

  private assertValidDateRange(startDate: string, endDate: string): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Term dates must be valid ISO 8601 date strings');
    }

    if (start >= end) {
      throw new BadRequestException('Term startDate must be before endDate');
    }
  }

  private assertWithinSchoolYear(
    startDate: string,
    endDate: string,
    yearStart: string,
    yearEnd: string,
  ): void {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const schoolStart = new Date(yearStart);
    const schoolEnd = new Date(yearEnd);

    if (start < schoolStart || end > schoolEnd) {
      throw new BadRequestException('Term dates must fall within the selected school year');
    }
  }

  private async assertNoOverlap(
    schoolYearId: string,
    startDate: string,
    endDate: string,
    ignoreTermId?: string,
  ): Promise<void> {
    const existingTerms = await this.repository.find({
      where: { schoolYearId },
    });

    const start = new Date(startDate);
    const end = new Date(endDate);

    const overlapping = existingTerms.find((term) => {
      if (ignoreTermId && term.termId === ignoreTermId) {
        return false;
      }

      const existingStart = new Date(term.startDate);
      const existingEnd = new Date(term.endDate);
      return existingStart <= end && start <= existingEnd;
    });

    if (overlapping) {
      throw new ConflictException('Term overlaps with an existing term in this school year');
    }
  }

  private normalizeTermName(name: string | TermName): TermName {
    const values = Object.values(TermName) as string[];
    if (!values.includes(name as string)) {
      throw new BadRequestException('Invalid term name');
    }

    return name as TermName;
  }
}
