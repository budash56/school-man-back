import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { SchoolYears } from './school_years.entity';

@Injectable()
export class SchoolYearsRepository extends BaseRepository<SchoolYears> {
  constructor(dataSource: DataSource) {
    super(SchoolYears, dataSource);
  }
}
