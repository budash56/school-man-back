import { Injectable, NotFoundException } from '@nestjs/common';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { CurriculaRepository } from '../curricula/curricula.repository';
import { SubjectsRepository } from '../subjects/subjects.repository';
import { CurriculumItemsRepository } from './curriculum_items.repository';
import { CreateCurriculumItemDto } from './dto/create-curriculum-item.dto';
import { UpdateCurriculumItemDto } from './dto/update-curriculum-item.dto';

@Injectable()
export class CurriculumItemsService {
  constructor(
    private readonly curriculumItemsRepository: CurriculumItemsRepository,
    private readonly curriculaRepository: CurriculaRepository,
    private readonly subjectsRepository: SubjectsRepository,
  ) {}

  async create(dto: CreateCurriculumItemDto) {
    const curriculum = await this.curriculaRepository.findOne({
      where: { curriculumId: dto.curriculumId.toString() },
    });

    if (!curriculum) {
      throw new NotFoundException('Curriculum not found');
    }

    const subject = await this.subjectsRepository.findOne({
      where: { subjectId: dto.subjectId.toString() },
    });

    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    const notes = dto.notes?.trim();
    const item = this.curriculumItemsRepository.create({
      curriculumId: curriculum.curriculumId,
      subjectId: subject.subjectId,
      weeklyHours: dto.weeklyHours ?? 0,
      doubleSessionRequired: dto.doubleSessionRequired ?? false,
      notes: notes && notes.length > 0 ? notes : null,
    });

    try {
      const saved = await this.curriculumItemsRepository.save(item);
      return this.findOne(Number(saved.curriculumItemId));
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Subject already exists in this curriculum',
      );
    }
  }

  async findOne(id: number) {
    const item = await this.curriculumItemsRepository.findOne({
      where: { curriculumItemId: id.toString() },
      relations: { subject: true },
    });

    if (!item) {
      throw new NotFoundException('Curriculum item not found');
    }

    return item;
  }

  async update(id: number, dto: UpdateCurriculumItemDto) {
    const item = await this.findOne(id);

    if (dto.weeklyHours !== undefined) {
      item.weeklyHours = dto.weeklyHours;
    }

    if (dto.doubleSessionRequired !== undefined) {
      item.doubleSessionRequired = dto.doubleSessionRequired;
    }

    if (dto.notes !== undefined) {
      const trimmed = dto.notes.trim();
      item.notes = trimmed.length > 0 ? trimmed : null;
    }

    return this.curriculumItemsRepository.save(item);
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const item = await this.findOne(id);
    await this.curriculumItemsRepository.remove(item);
    return { deleted: true };
  }
}
