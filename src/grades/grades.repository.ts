import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { Grades } from './grades.entity';

@Injectable()
export class GradesRepository extends BaseRepository<Grades> {
  constructor(dataSource: DataSource) {
    super(Grades, dataSource);
  }
}
