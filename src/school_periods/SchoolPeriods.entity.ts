import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { ClassGroups } from "../class_groups/ClassGroups.entity";
import { CourseInstances } from "../course_instances/CourseInstances.entity";
import { Enrollments } from "../enrollments/Enrollments.entity";
import { Grades } from "../grades/Grades.entity";

@Index("school_periods_pkey", ["periodId"], { unique: true })
@Entity("school_periods", { schema: "public" })
export class SchoolPeriods {
  @PrimaryGeneratedColumn({ type: "bigint", name: "period_id" })
  periodId: string;

  @Column("character varying", { name: "name", length: 50 })
  name: string;

  @Column("date", { name: "start_date" })
  startDate: string;

  @Column("date", { name: "end_date" })
  endDate: string;

  @Column("boolean", { name: "is_active", default: () => "true" })
  isActive: boolean;

  @Column("timestamp with time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @OneToMany(() => ClassGroups, (classGroups) => classGroups.yearPeriod)
  classGroups: ClassGroups[];

  @OneToMany(() => ClassGroups, (classGroups) => classGroups.yearPeriod_2)
  classGroups2: ClassGroups[];

  @OneToMany(
    () => CourseInstances,
    (courseInstances) => courseInstances.yearPeriod
  )
  courseInstances: CourseInstances[];

  @OneToMany(() => Enrollments, (enrollments) => enrollments.yearPeriod)
  enrollments: Enrollments[];

  @OneToMany(() => Enrollments, (enrollments) => enrollments.yearPeriod_2)
  enrollments2: Enrollments[];

  @OneToMany(() => Grades, (grades) => grades.period)
  grades: Grades[];
}
