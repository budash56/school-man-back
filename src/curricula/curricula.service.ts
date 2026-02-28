import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { In } from 'typeorm';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { SubjectsRepository } from '../subjects/subjects.repository';
import { Subjects } from '../subjects/subjects.entity';
import { SubjectAreasRepository } from '../subject_areas/subject_areas.repository';
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
    private readonly subjectAreasRepository: SubjectAreasRepository,
  ) {}

  async findAll(query: CurriculaQueryDto): Promise<Curricula[]> {
    const qb = this.curriculaRepository
      .createQueryBuilder('curricula')
      .leftJoinAndSelect('curricula.items', 'items')
      .leftJoinAndSelect('items.subject', 'subject')
      .leftJoinAndSelect('curricula.specializationArea', 'specializationArea')
      .orderBy('curricula.grade_level', 'ASC')
      .addOrderBy('curricula.track_name', 'ASC')
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
      relations: { items: { subject: true }, specializationArea: true },
    });

    if (!curriculum) {
      throw new NotFoundException('Curriculum not found');
    }

    return curriculum;
  }

  async create(dto: CreateCurriculumDto): Promise<Curricula> {
    this.assertUniqueSubjects(dto);

    const trackName = dto.trackName?.trim() || null;
    const specializationAreaId = dto.specializationAreaId?.toString() ?? null;
    if (trackName && dto.gradeLevel !== 10) {
      throw new BadRequestException(
        'Specialization tracks must be created for grade 10 (grade 11 is created automatically)',
      );
    }
    if (trackName && !specializationAreaId) {
      throw new BadRequestException(
        'Specialization curricula must include a specialization area',
      );
    }
    if (!trackName && specializationAreaId) {
      throw new BadRequestException(
        'Specialization area is only allowed for specialization curricula',
      );
    }

    if (trackName && specializationAreaId) {
      const area = await this.subjectAreasRepository.findOne({
        where: { areaId: specializationAreaId },
      });
      if (!area || !area.isSpecialization) {
        throw new BadRequestException(
          'Specialization area must exist and be marked as specialization',
        );
      }
    }

    const subjects = await this.loadSubjects(dto);
    if (trackName && specializationAreaId) {
      this.assertSubjectsAllowedForSpecialization(subjects, specializationAreaId);
    } else {
      this.assertSubjectsAllowedForBaseCurriculum(subjects);
    }

    return this.curriculaRepository.manager.transaction(async (manager) => {
      const curriculaRepo = manager.getRepository(Curricula);
      const itemsRepo = manager.getRepository(CurriculumItems);

      const createCurriculum = async (
        gradeLevel: number,
        name: string,
        trackNameValue: string | null,
        specializationAreaIdValue: string | null,
      ) => {
        const curriculum = curriculaRepo.create({
          gradeLevel,
          name,
          isActive: dto.isActive ?? true,
          trackName: trackNameValue,
          specializationAreaId: specializationAreaIdValue,
        });

        try {
          return await curriculaRepo.save(curriculum);
        } catch (error) {
          DbErrorMapper.throwConflict(
            error,
            'A curriculum for this grade already exists',
          );
        }
      };

      const normalizedName = dto.name.trim();
      const specializationName = trackName ?? null;
      const nameForGrade10 = specializationName
        ? `${specializationName} 10`
        : normalizedName;

      const savedCurriculum = await createCurriculum(
        dto.gradeLevel,
        nameForGrade10,
        trackName,
        specializationAreaId,
      );

      const buildItems = (curriculumId: string) =>
        dto.items.map((item) =>
          itemsRepo.create({
            curriculumId,
            subjectId: item.subjectId.toString(),
            weeklyHours: item.weeklyHours ?? 0,
            doubleSessionRequired: item.doubleSessionRequired ?? false,
            notes: item.notes ?? null,
          }),
        );

      const savedItems = await itemsRepo.save(
        buildItems(savedCurriculum.curriculumId),
      );
      savedCurriculum.items = savedItems;

      if (trackName) {
        const existingGrade11 = await curriculaRepo.findOne({
          where: { gradeLevel: 11, trackName },
        });

        if (!existingGrade11) {
          const grade11Name = specializationName
            ? `${specializationName} 11`
            : normalizedName.replace(/\b10\b/g, '11');
          const savedGrade11 = await createCurriculum(
            11,
            grade11Name,
            trackName,
            specializationAreaId,
          );
          await itemsRepo.save(buildItems(savedGrade11.curriculumId));
        }
      }

      return savedCurriculum;
    });
  }

  async linkSpecializationArea(
    curriculumId: number,
    specializationAreaId: number,
  ): Promise<Curricula> {
    const curriculum = await this.curriculaRepository.findOne({
      where: { curriculumId: curriculumId.toString() },
    });

    if (!curriculum) {
      throw new NotFoundException('Curriculum not found');
    }

    if (!curriculum.trackName) {
      throw new BadRequestException(
        'Only specialization curricula can be linked to a specialization area',
      );
    }

    const area = await this.subjectAreasRepository.findOne({
      where: { areaId: specializationAreaId.toString() },
    });
    if (!area || !area.isSpecialization) {
      throw new BadRequestException(
        'Specialization area must exist and be marked as specialization',
      );
    }

    await this.curriculaRepository.update(
      { trackName: curriculum.trackName, gradeLevel: In([10, 11]) },
      { specializationAreaId: specializationAreaId.toString() },
    );

    return this.findOne(curriculumId);
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

  private async loadSubjects(dto: CreateCurriculumDto): Promise<Subjects[]> {
    const ids = Array.from(
      new Set(dto.items.map((item) => item.subjectId.toString())),
    );

    const subjects = await this.subjectsRepository.find({
      where: { subjectId: In(ids) },
      relations: { area: true },
    });

    if (subjects.length === ids.length) {
      return subjects;
    }

    const found = new Set(subjects.map((subject) => subject.subjectId));
    const missing = ids.filter((id) => !found.has(id));

    throw new NotFoundException(
      `Subjects not found: ${missing.map((id) => id).join(', ')}`,
    );
  }

  private assertSubjectsAllowedForSpecialization(
    subjects: Subjects[],
    specializationAreaId: string,
  ): void {
    const invalid = subjects.filter(
      (subject) =>
        subject.area?.isSpecialization &&
        subject.area.areaId !== specializationAreaId,
    );
    if (invalid.length === 0) {
      return;
    }
    const names = invalid.map((subject) => subject.name).join(', ');
    throw new BadRequestException(
      `Subjects from other specialization areas are not allowed: ${names}`,
    );
  }

  private assertSubjectsAllowedForBaseCurriculum(subjects: Subjects[]): void {
    const invalid = subjects.filter((subject) => subject.area?.isSpecialization);
    if (invalid.length === 0) {
      return;
    }
    const names = invalid.map((subject) => subject.name).join(', ');
    throw new BadRequestException(
      `Specialization subjects are not allowed in base curricula: ${names}`,
    );
  }
}
