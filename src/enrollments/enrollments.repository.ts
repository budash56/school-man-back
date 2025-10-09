import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { Enrollments } from './enrollments.entity';

@Injectable()
export class EnrollmentsRepository extends BaseRepository<Enrollments> {
  constructor(dataSource: DataSource) {
    super(Enrollments, dataSource);
  }
}
