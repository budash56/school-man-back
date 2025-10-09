import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { TimetableAssignments } from './timetable_assignments.entity';

@Injectable()
export class TimetableAssignmentsRepository extends BaseRepository<TimetableAssignments> {
  constructor(dataSource: DataSource) {
    super(TimetableAssignments, dataSource);
  }
}
