// ORM mapping for the timetable_slots table generated from the current database schema.
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TimetableAssignments } from '../timetable_assignments/timetable_assignments.entity';

@Index(
  'timetable_slots_day_of_week_start_time_end_time_key',
  ['dayOfWeek', 'endTime', 'startTime'],
  { unique: true }
)
@Index('timetable_slots_pkey', ['slotId'], { unique: true })
@Entity('timetable_slots', { schema: 'public' })
export class TimetableSlots {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'slot_id' })
  slotId: string;

  @Column('smallint', { name: 'day_of_week', unique: true })
  dayOfWeek: number;

  @Column('time without time zone', { name: 'start_time', unique: true })
  startTime: string;

  @Column('time without time zone', { name: 'end_time', unique: true })
  endTime: string;

  @OneToMany(
    () => TimetableAssignments,
    (timetableAssignments) => timetableAssignments.slot
  )
  timetableAssignments: TimetableAssignments[];
}
