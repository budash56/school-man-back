import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { CourseInstances } from './course_instances.entity';

@Injectable()
export class CourseInstancesRepository extends BaseRepository<CourseInstances> {
  constructor(dataSource: DataSource) {
    super(CourseInstances, dataSource);
  }
}
