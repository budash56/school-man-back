import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { TimetableAssignments } from "../timetable_assignments/TimetableAssignments.entity";

@Index("timetable_slots_pkey", ["slotId"], { unique: true })
@Entity("timetable_slots", { schema: "public" })
export class TimetableSlots {
  @PrimaryGeneratedColumn({ type: "bigint", name: "slot_id" })
  slotId: string;

  @Column("smallint", { name: "day_of_week" })
  dayOfWeek: number;

  @Column("time without time zone", { name: "start_time" })
  startTime: string;

  @Column("time without time zone", { name: "end_time" })
  endTime: string;

  @OneToMany(
    () => TimetableAssignments,
    (timetableAssignments) => timetableAssignments.slot
  )
  timetableAssignments: TimetableAssignments[];
}
