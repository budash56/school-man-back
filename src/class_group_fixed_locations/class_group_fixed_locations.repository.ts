import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { ClassGroupFixedLocations } from './class_group_fixed_locations.entity';

@Injectable()
export class ClassGroupFixedLocationsRepository extends BaseRepository<ClassGroupFixedLocations> {
  constructor(dataSource: DataSource) {
    super(ClassGroupFixedLocations, dataSource);
  }
}
