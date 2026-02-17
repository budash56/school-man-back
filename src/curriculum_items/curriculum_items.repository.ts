import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { CurriculumItems } from './curriculum_items.entity';

@Injectable()
export class CurriculumItemsRepository extends BaseRepository<CurriculumItems> {
  constructor(dataSource: DataSource) {
    super(CurriculumItems, dataSource);
  }
}
