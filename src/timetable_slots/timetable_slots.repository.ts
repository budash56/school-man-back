import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { TimetableSlot } from './timetable_slots.entity';

@Injectable()
export class TimetableSlotRepository extends BaseRepository<TimetableSlot> {
  constructor(dataSource: DataSource) {
    super(TimetableSlot, dataSource);
  }
}
