import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { TeacherSubjects } from './teacher_subjects.entity';

@Injectable()
export class TeacherSubjectsRepository extends BaseRepository<TeacherSubjects> {
  constructor(dataSource: DataSource) {
    super(TeacherSubjects, dataSource);
  }
}
