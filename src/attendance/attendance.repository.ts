import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { Attendance } from './attendance.entity';

@Injectable()
export class AttendanceRepository extends BaseRepository<Attendance> {
  constructor(dataSource: DataSource) {
    super(Attendance, dataSource);
  }
}
