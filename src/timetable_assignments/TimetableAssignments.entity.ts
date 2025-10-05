import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Classrooms } from "../classrooms/Classrooms.entity";
import { Courses } from "../courses/Courses.entity";
import { TimetableSlots } from "../timetable_slots/TimetableSlots.entity";

@Index("timetable_assignments_pkey", ["assignmentId"], { unique: true })
@Entity("timetable_assignments", { schema: "public" })
export class TimetableAssignments {
  @PrimaryGeneratedColumn({ type: "bigint", name: "assignment_id" })
  assignmentId: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @ManyToOne(() => Classrooms, (classrooms) => classrooms.timetableAssignments)
  @JoinColumn([{ name: "classroom_id", referencedColumnName: "classroomId" }])
  classroom: Classrooms;

  @ManyToOne(() => Courses, (courses) => courses.timetableAssignments)
  @JoinColumn([{ name: "course_id", referencedColumnName: "courseId" }])
  course: Courses;

  @ManyToOne(
    () => TimetableSlots,
    (timetableSlots) => timetableSlots.timetableAssignments
  )
  @JoinColumn([{ name: "slot_id", referencedColumnName: "slotId" }])
  slot: TimetableSlots;
}
