import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { Students } from './students.entity';

@Injectable()
export class StudentsRepository extends BaseRepository<Students> {
  constructor(dataSource: DataSource) {
    super(Students, dataSource);
  }
}
