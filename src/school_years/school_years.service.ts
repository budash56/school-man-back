import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { SchoolYears } from './school_years.entity';
import { SchoolYearsRepository } from './school_years.repository';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { UpdateSchoolYearDto } from './dto/update-school-year.dto';
import { SchoolYearsQueryDto } from './dto/school-years-query.dto';

@Injectable()
export class SchoolYearsService {
  constructor(private readonly repository: SchoolYearsRepository) {}

  async findAll(query: SchoolYearsQueryDto): Promise<SchoolYears[]> {
    const qb = this.repository.createQueryBuilder('schoolYears');
    qb.where('1=1');

    if (query.active !== undefined) {
      qb.andWhere('schoolYears.isActive = :isActive', { isActive: query.active });
    }

    if (query.name?.trim()) {
      qb.andWhere('schoolYears.name ILIKE :name ESCAPE \'\\\'', {
        name: this.buildNameSearch(query.name),
      });
    }

    qb.orderBy('schoolYears.yearStart', 'DESC');

    return qb.getMany();
  }

  async findOne(id: number): Promise<SchoolYears> {
    const schoolYear = await this.repository.findOne({
      where: { schoolYearId: id.toString() },
    });

    if (!schoolYear) {
      throw new NotFoundException('School year not found');
    }

    return schoolYear;
  }

  async create(dto: CreateSchoolYearDto): Promise<SchoolYears> {
    this.assertChronologicalOrder(dto.startDate, dto.endDate, 'startDate', 'endDate');

    const entity = this.repository.create({
      name: dto.name,
      yearStart: dto.startDate,
      yearEnd: dto.endDate,
      isActive: dto.active,
    });

    try {
      return await this.repository.save(entity);
    } catch (error) {
      DbErrorMapper.throwConflict(error, 'A school year with this name already exists');
    }
  }

  async update(id: number, dto: UpdateSchoolYearDto): Promise<SchoolYears> {
    const schoolYear = await this.findOne(id);

    const start = dto.startDate ?? schoolYear.yearStart;
    const end = dto.endDate ?? schoolYear.yearEnd;

    this.assertChronologicalOrder(
      start,
      end,
      dto.startDate ? 'startDate' : 'yearStart',
      dto.endDate ? 'endDate' : 'yearEnd',
    );

    this.repository.merge(schoolYear, {
      name: dto.name ?? schoolYear.name,
      yearStart: start,
      yearEnd: end,
      isActive: dto.active ?? schoolYear.isActive,
    });

    try {
      return await this.repository.save(schoolYear);
    } catch (error) {
      DbErrorMapper.throwConflict(error, 'A school year with this name already exists');
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const schoolYear = await this.findOne(id);
    await this.repository.remove(schoolYear);
    return { deleted: true };
  }

  private assertChronologicalOrder(
    startDate: string,
    endDate: string,
    startKey: string,
    endKey: string,
  ): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException(`Invalid date values for ${startKey} or ${endKey}`);
    }

    if (start >= end) {
      throw new BadRequestException('School year startDate must be before endDate');
    }
  }

  private buildNameSearch(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) {
      return '%%';
    }

    const escaped = trimmed.replace(/[%_]/g, (match) => `\\${match}`);
    return `%${escaped}%`;
  }
}
