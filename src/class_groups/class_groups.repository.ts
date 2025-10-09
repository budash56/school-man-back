import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { ClassGroups } from './class_groups.entity';

@Injectable()
export class ClassGroupsRepository extends BaseRepository<ClassGroups> {
  constructor(dataSource: DataSource) {
    super(ClassGroups, dataSource);
  }
}
