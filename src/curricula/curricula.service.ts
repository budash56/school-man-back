import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { In } from 'typeorm';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { SubjectsRepository } from '../subjects/subjects.repository';
import { Curricula } from './curricula.entity';
import { CurriculumItems } from '../curriculum_items/curriculum_items.entity';
import { CurriculaRepository } from './curricula.repository';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { CurriculaQueryDto } from './dto/curricula-query.dto';

@Injectable()
export class CurriculaService {
  constructor(
    private readonly curriculaRepository: CurriculaRepository,
    private readonly subjectsRepository: SubjectsRepository,
  ) {}

  async findAll(query: CurriculaQueryDto): Promise<Curricula[]> {
    const qb = this.curriculaRepository
      .createQueryBuilder('curricula')
      .leftJoinAndSelect('curricula.items', 'items')
      .leftJoinAndSelect('items.subject', 'subject')
      .orderBy('curricula.grade_level', 'ASC')
      .addOrderBy('items.subject_id', 'ASC');

    if (query.gradeLevel) {
      qb.andWhere('curricula.grade_level = :gradeLevel', {
        gradeLevel: query.gradeLevel,
      });
    }

    if (query.active !== undefined) {
      qb.andWhere('curricula.is_active = :isActive', {
        isActive: query.active,
      });
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<Curricula> {
    const curriculum = await this.curriculaRepository.findOne({
      where: { curriculumId: id.toString() },
      relations: { items: { subject: true } },
    });

    if (!curriculum) {
      throw new NotFoundException('Curriculum not found');
    }

    return curriculum;
  }

  async create(dto: CreateCurriculumDto): Promise<Curricula> {
    this.assertUniqueSubjects(dto);
    await this.assertSubjectsExist(dto);

    return this.curriculaRepository.manager.transaction(async (manager) => {
      const curriculaRepo = manager.getRepository(Curricula);
      const itemsRepo = manager.getRepository(CurriculumItems);

      const curriculum = curriculaRepo.create({
        gradeLevel: dto.gradeLevel,
        name: dto.name.trim(),
        isActive: dto.isActive ?? true,
      });

      let savedCurriculum: Curricula;
      try {
        savedCurriculum = await curriculaRepo.save(curriculum);
      } catch (error) {
        DbErrorMapper.throwConflict(
          error,
          'A curriculum for this grade already exists',
        );
      }

      const items = dto.items.map((item) =>
        itemsRepo.create({
          curriculumId: savedCurriculum.curriculumId,
          subjectId: item.subjectId.toString(),
          weeklyHours: item.weeklyHours ?? 0,
          doubleSessionRequired: item.doubleSessionRequired ?? false,
          notes: item.notes ?? null,
        }),
      );

      const savedItems = await itemsRepo.save(items);
      savedCurriculum.items = savedItems;

      return savedCurriculum;
    });
  }

  private assertUniqueSubjects(dto: CreateCurriculumDto): void {
    const ids = dto.items.map((item) => item.subjectId);
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      throw new BadRequestException(
        'Duplicate subjects are not allowed in curriculum items',
      );
    }
  }

  private async assertSubjectsExist(dto: CreateCurriculumDto): Promise<void> {
    const ids = Array.from(
      new Set(dto.items.map((item) => item.subjectId.toString())),
    );

    const subjects = await this.subjectsRepository.findBy({
      subjectId: In(ids),
    });

    if (subjects.length === ids.length) {
      return;
    }

    const found = new Set(subjects.map((subject) => subject.subjectId));
    const missing = ids.filter((id) => !found.has(id));

    throw new NotFoundException(
      `Subjects not found: ${missing.map((id) => id).join(', ')}`,
    );
  }
}
