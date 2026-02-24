import { Injectable, NotFoundException } from '@nestjs/common';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { ClassGroupsRepository } from '../class_groups/class_groups.repository';
import { CurriculumItemsRepository } from '../curriculum_items/curriculum_items.repository';
import { ClassGroupCurriculumOverridesRepository } from './class_group_curriculum_overrides.repository';
import { ClassGroupCurriculumOverrides } from './class_group_curriculum_overrides.entity';
import { CreateClassGroupCurriculumOverrideDto } from './dto/create-class-group-curriculum-override.dto';
import { UpdateClassGroupCurriculumOverrideDto } from './dto/update-class-group-curriculum-override.dto';
import { ClassGroupCurriculumOverridesQueryDto } from './dto/class-group-curriculum-overrides-query.dto';

@Injectable()
export class ClassGroupCurriculumOverridesService {
  constructor(
    private readonly repository: ClassGroupCurriculumOverridesRepository,
    private readonly classGroupsRepository: ClassGroupsRepository,
    private readonly curriculumItemsRepository: CurriculumItemsRepository,
  ) {}

  async findAll(
    query: ClassGroupCurriculumOverridesQueryDto,
  ): Promise<ClassGroupCurriculumOverrides[]> {
    const qb = this.repository
      .createQueryBuilder('overrides')
      .leftJoinAndSelect('overrides.classGroup', 'classGroup')
      .leftJoinAndSelect('overrides.curriculumItem', 'curriculumItem')
      .leftJoinAndSelect('curriculumItem.subject', 'subject')
      .orderBy('overrides.created_at', 'DESC');

    if (query.classGroupId) {
      qb.andWhere('overrides.classGroupId = :classGroupId', {
        classGroupId: query.classGroupId.toString(),
      });
    }

    if (query.curriculumItemId) {
      qb.andWhere('overrides.curriculumItemId = :curriculumItemId', {
        curriculumItemId: query.curriculumItemId.toString(),
      });
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<ClassGroupCurriculumOverrides> {
    const entity = await this.repository.findOne({
      where: { overrideId: id.toString() },
      relations: { classGroup: true, curriculumItem: { subject: true } },
    });

    if (!entity) {
      throw new NotFoundException('Class group curriculum override not found');
    }

    return entity;
  }

  async create(
    dto: CreateClassGroupCurriculumOverrideDto,
  ): Promise<ClassGroupCurriculumOverrides> {
    const classGroup = await this.classGroupsRepository.findOne({
      where: { classGroupId: dto.classGroupId.toString() },
    });

    if (!classGroup) {
      throw new NotFoundException('Class group not found');
    }

    const curriculumItem = await this.curriculumItemsRepository.findOne({
      where: { curriculumItemId: dto.curriculumItemId.toString() },
    });

    if (!curriculumItem) {
      throw new NotFoundException('Curriculum item not found');
    }

    const entity = this.repository.create({
      classGroupId: classGroup.classGroupId,
      curriculumItemId: curriculumItem.curriculumItemId,
      weeklyHoursOverride: dto.weeklyHoursOverride ?? null,
      doubleSessionOverride: dto.doubleSessionOverride ?? null,
      isDisabled: dto.isDisabled ?? false,
    });

    try {
      return await this.repository.save(entity);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Override already exists for this class group and curriculum item',
      );
    }
  }

  async update(
    id: number,
    dto: UpdateClassGroupCurriculumOverrideDto,
  ): Promise<ClassGroupCurriculumOverrides> {
    const entity = await this.findOne(id);

    if (dto.classGroupId) {
      const classGroup = await this.classGroupsRepository.findOne({
        where: { classGroupId: dto.classGroupId.toString() },
      });

      if (!classGroup) {
        throw new NotFoundException('Class group not found');
      }

      entity.classGroupId = classGroup.classGroupId;
    }

    if (dto.curriculumItemId) {
      const curriculumItem = await this.curriculumItemsRepository.findOne({
        where: { curriculumItemId: dto.curriculumItemId.toString() },
      });

      if (!curriculumItem) {
        throw new NotFoundException('Curriculum item not found');
      }

      entity.curriculumItemId = curriculumItem.curriculumItemId;
    }

    this.repository.merge(entity, {
      weeklyHoursOverride:
        dto.weeklyHoursOverride !== undefined
          ? dto.weeklyHoursOverride
          : entity.weeklyHoursOverride,
      doubleSessionOverride:
        dto.doubleSessionOverride !== undefined
          ? dto.doubleSessionOverride
          : entity.doubleSessionOverride,
      isDisabled: dto.isDisabled ?? entity.isDisabled,
    });

    try {
      return await this.repository.save(entity);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Override already exists for this class group and curriculum item',
      );
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { deleted: true };
  }
}
