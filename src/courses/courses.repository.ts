import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { Courses } from './courses.entity';

@Injectable()
export class CoursesRepository extends BaseRepository<Courses> {
  constructor(dataSource: DataSource) {
    super(Courses, dataSource);
  }
}
