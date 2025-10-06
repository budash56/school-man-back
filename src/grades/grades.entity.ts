import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Courses } from "../courses/Courses.entity";
import { SchoolPeriods } from "../school_periods/SchoolPeriods.entity";
import { Users } from "../users/Users.entity";
import { Students } from "../students/Students.entity";

@Index("idx_grades_course_period", ["courseId", "periodId"], {})
@Index(
  "grades_student_id_course_id_period_id_key",
  ["courseId", "periodId", "studentId"],
  { unique: true }
)
@Index("grades_pkey", ["gradeId"], { unique: true })
@Index("idx_grades_student_period", ["periodId", "studentId"], {})
@Entity("grades", { schema: "public" })
export class Grades {
  @PrimaryGeneratedColumn({ type: "bigint", name: "grade_id" })
  gradeId: string;

  @Column("bigint", { name: "student_id", unique: true })
  studentId: string;

  @Column("bigint", { name: "course_id", unique: true })
  courseId: string;

  @Column("bigint", { name: "period_id", unique: true })
  periodId: string;

  @Column("numeric", { name: "grade_value", precision: 5, scale: 2 })
  gradeValue: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @ManyToOne(() => Courses, (courses) => courses.grades)
  @JoinColumn([{ name: "course_id", referencedColumnName: "courseId" }])
  course: Courses;

  @ManyToOne(() => SchoolPeriods, (schoolPeriods) => schoolPeriods.grades)
  @JoinColumn([{ name: "period_id", referencedColumnName: "periodId" }])
  period: SchoolPeriods;

  @ManyToOne(() => Users, (users) => users.grades)
  @JoinColumn([{ name: "recorded_by", referencedColumnName: "nationalId" }])
  recordedBy: Users;

  @ManyToOne(() => Students, (students) => students.grades)
  @JoinColumn([{ name: "student_id", referencedColumnName: "studentId" }])
  student: Students;
}
