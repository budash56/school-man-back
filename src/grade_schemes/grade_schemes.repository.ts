import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { GradeSchemes } from './grade_schemes.entity';

@Injectable()
export class GradeSchemesRepository extends BaseRepository<GradeSchemes> {
  constructor(dataSource: DataSource) {
    super(GradeSchemes, dataSource);
  }
}
