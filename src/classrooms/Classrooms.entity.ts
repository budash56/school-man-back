import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ClassGroups } from "../class_groups/ClassGroups.entity";
import { TimetableAssignments } from "../timetable_assignments/TimetableAssignments.entity";

@Index("classrooms_pkey", ["classroomId"], { unique: true })
@Entity("classrooms", { schema: "public" })
export class Classrooms {
  @PrimaryGeneratedColumn({ type: "bigint", name: "classroom_id" })
  classroomId: string;

  @Column("character varying", { name: "code", length: 20 })
  code: string;

  @Column("character varying", { name: "building", nullable: true, length: 80 })
  building: string | null;

  @Column("integer", { name: "capacity", nullable: true })
  capacity: number | null;

  @Column("timestamp with time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @OneToMany(() => ClassGroups, (classGroups) => classGroups.classroom)
  classGroups: ClassGroups[];

  @OneToMany(
    () => TimetableAssignments,
    (timetableAssignments) => timetableAssignments.classroom
  )
  timetableAssignments: TimetableAssignments[];
}
