import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { SubjectAreas } from './subject_areas.entity';

@Injectable()
export class SubjectAreasRepository extends BaseRepository<SubjectAreas> {
  constructor(dataSource: DataSource) {
    super(SubjectAreas, dataSource);
  }
}
