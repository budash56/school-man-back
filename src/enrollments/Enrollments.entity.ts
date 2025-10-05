import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ClassGroups } from "../class_groups/ClassGroups.entity";
import { Students } from "../students/Students.entity";
import { SchoolPeriods } from "../school_periods/SchoolPeriods.entity";

@Index(
  "enrollments_student_id_class_group_id_year_period_id_key",
  ["classGroupId", "studentId", "yearPeriodId"],
  { unique: true }
)
@Index("enrollments_pkey", ["enrollmentId"], { unique: true })
@Index("idx_enrollments_student", ["studentId"], {})
@Index("idx_enrollments_period", ["yearPeriodId"], {})
@Entity("enrollments", { schema: "public" })
export class Enrollments {
  @PrimaryGeneratedColumn({ type: "bigint", name: "enrollment_id" })
  enrollmentId: string;

  @Column("bigint", { name: "student_id", unique: true })
  studentId: string;

  @Column("bigint", { name: "class_group_id", unique: true })
  classGroupId: string;

  @Column("timestamp with time zone", {
    name: "enrolled_at",
    nullable: true,
    default: () => "now()",
  })
  enrolledAt: Date | null;

  @Column("boolean", { name: "active", nullable: true, default: () => "true" })
  active: boolean | null;

  @Column("bigint", { name: "year_period_id", unique: true })
  yearPeriodId: string;

  @ManyToOne(() => ClassGroups, (classGroups) => classGroups.enrollments)
  @JoinColumn([
    { name: "class_group_id", referencedColumnName: "classGroupId" },
  ])
  classGroup: ClassGroups;

  @ManyToOne(() => Students, (students) => students.enrollments)
  @JoinColumn([{ name: "student_id", referencedColumnName: "studentId" }])
  student: Students;

  @ManyToOne(() => SchoolPeriods, (schoolPeriods) => schoolPeriods.enrollments)
  @JoinColumn([{ name: "year_period_id", referencedColumnName: "periodId" }])
  yearPeriod: SchoolPeriods;

  @ManyToOne(() => SchoolPeriods, (schoolPeriods) => schoolPeriods.enrollments2)
  @JoinColumn([{ name: "year_period_id", referencedColumnName: "periodId" }])
  yearPeriod_2: SchoolPeriods;
}
