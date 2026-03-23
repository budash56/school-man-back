import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { CalendarEvents } from './calendar-events.entity';

@Injectable()
export class CalendarEventsRepository extends BaseRepository<CalendarEvents> {
  constructor(dataSource: DataSource) {
    super(CalendarEvents, dataSource);
  }
}
