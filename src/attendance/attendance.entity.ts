import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Courses } from "../courses/Courses.entity";
import { Users } from "../users/Users.entity";
import { Students } from "../students/Students.entity";

@Index("attendance_pkey", ["attendanceId"], { unique: true })
@Index("idx_attendance_course_date", ["courseId", "date"], {})
@Index("idx_attendance_student_date", ["date", "studentId"], {})
@Entity("attendance", { schema: "public" })
export class Attendance {
  @PrimaryGeneratedColumn({ type: "bigint", name: "attendance_id" })
  attendanceId: string;

  @Column("bigint", { name: "student_id" })
  studentId: string;

  @Column("date", { name: "date" })
  date: string;

  @Column("enum", {
    name: "status",
    enum: ["present", "absent", "late", "excused"],
  })
  status: "present" | "absent" | "late" | "excused";

  @Column("timestamp with time zone", {
    name: "recorded_at",
    nullable: true,
    default: () => "now()",
  })
  recordedAt: Date | null;

  @Column("text", { name: "reason_note", nullable: true })
  reasonNote: string | null;

  @Column("bigint", { name: "course_id", nullable: true })
  courseId: string | null;

  @ManyToOne(() => Courses, (courses) => courses.attendances)
  @JoinColumn([{ name: "course_id", referencedColumnName: "courseId" }])
  course: Courses;

  @ManyToOne(() => Users, (users) => users.attendances)
  @JoinColumn([{ name: "recorded_by", referencedColumnName: "nationalId" }])
  recordedBy: Users;

  @ManyToOne(() => Students, (students) => students.attendances)
  @JoinColumn([{ name: "student_id", referencedColumnName: "studentId" }])
  student: Students;
}
