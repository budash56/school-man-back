import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { Subjects } from './subjects.entity';

@Injectable()
export class SubjectsRepository extends BaseRepository<Subjects> {
  constructor(dataSource: DataSource) {
    super(Subjects, dataSource);
  }
}
