import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { GradeSchemeValues } from './grade_scheme_values.entity';

@Injectable()
export class GradeSchemeValuesRepository extends BaseRepository<GradeSchemeValues> {
  constructor(dataSource: DataSource) {
    super(GradeSchemeValues, dataSource);
  }
}
