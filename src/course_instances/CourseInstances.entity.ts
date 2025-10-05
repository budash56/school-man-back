import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Subjects } from "../subjects/Subjects.entity";
import { SchoolPeriods } from "../school_periods/SchoolPeriods.entity";
import { Courses } from "../courses/Courses.entity";

@Index(
  "course_instances_course_code_year_period_id_key",
  ["courseCode", "yearPeriodId"],
  { unique: true }
)
@Index("course_instances_pkey", ["courseInstanceId"], { unique: true })
@Entity("course_instances", { schema: "public" })
export class CourseInstances {
  @PrimaryGeneratedColumn({ type: "bigint", name: "course_instance_id" })
  courseInstanceId: string;

  @Column("character varying", {
    name: "course_code",
    unique: true,
    length: 50,
  })
  courseCode: string;

  @Column("character varying", { name: "course_name", length: 120 })
  courseName: string;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("integer", { name: "grade_level" })
  gradeLevel: number;

  @Column("integer", { name: "weekly_hours" })
  weeklyHours: number;

  @Column("bigint", { name: "year_period_id", unique: true })
  yearPeriodId: string;

  @Column("boolean", {
    name: "is_active",
    nullable: true,
    default: () => "true",
  })
  isActive: boolean | null;

  @Column("timestamp with time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @ManyToOne(() => Subjects, (subjects) => subjects.courseInstances)
  @JoinColumn([{ name: "subject_id", referencedColumnName: "subjectId" }])
  subject: Subjects;

  @ManyToOne(
    () => SchoolPeriods,
    (schoolPeriods) => schoolPeriods.courseInstances
  )
  @JoinColumn([{ name: "year_period_id", referencedColumnName: "periodId" }])
  yearPeriod: SchoolPeriods;

  @OneToMany(() => Courses, (courses) => courses.courseInstance)
  courses: Courses[];
}
