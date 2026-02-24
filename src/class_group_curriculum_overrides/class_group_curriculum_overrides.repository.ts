import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { ClassGroupCurriculumOverrides } from './class_group_curriculum_overrides.entity';

@Injectable()
export class ClassGroupCurriculumOverridesRepository extends BaseRepository<ClassGroupCurriculumOverrides> {
  constructor(dataSource: DataSource) {
    super(ClassGroupCurriculumOverrides, dataSource);
  }
}
