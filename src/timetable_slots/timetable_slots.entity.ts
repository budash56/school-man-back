import { Entity, PrimaryGeneratedColumn, Column, Unique, Check } from 'typeorm';

@Entity('timetable_slots')
@Unique('uniq_timetable_slot', ['dayOfWeek', 'startTime', 'endTime'])
@Check('chk_slot_time', '"start_time" < "end_time"')
export class TimetableSlot {
  @PrimaryGeneratedColumn({ name: 'slot_id' })
  slotId: number;

  @Column({ type: 'smallint', name: 'day_of_week' })
  dayOfWeek: number; // 1..7

  @Column({ type: 'time', name: 'start_time' })
  startTime: string; // '08:00:00'

  @Column({ type: 'time', name: 'end_time' })
  endTime: string; // '08:45:00'
  timetableAssignments: any;
}
