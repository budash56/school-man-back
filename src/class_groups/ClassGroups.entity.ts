import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Classrooms } from "../classrooms/Classrooms.entity";
import { SchoolPeriods } from "../school_periods/SchoolPeriods.entity";
import { Courses } from "../courses/Courses.entity";
import { Enrollments } from "../enrollments/Enrollments.entity";

@Index("class_groups_pkey", ["classGroupId"], { unique: true })
@Index("idx_class_groups_grade", ["gradeLevel", "yearPeriodId"], {})
@Index(
  "class_groups_grade_level_section_year_period_id_key",
  ["gradeLevel", "section", "yearPeriodId"],
  { unique: true }
)
@Index("idx_class_groups_period", ["yearPeriodId"], {})
@Entity("class_groups", { schema: "public" })
export class ClassGroups {
  @PrimaryGeneratedColumn({ type: "bigint", name: "class_group_id" })
  classGroupId: string;

  @Column("integer", { name: "grade_level", unique: true })
  gradeLevel: number;

  @Column("character varying", {
    name: "section",
    nullable: true,
    unique: true,
    length: 10,
  })
  section: string | null;

  @Column("bigint", { name: "year_period_id", nullable: true, unique: true })
  yearPeriodId: string | null;

  @Column("timestamp with time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @ManyToOne(() => Classrooms, (classrooms) => classrooms.classGroups)
  @JoinColumn([{ name: "classroom_id", referencedColumnName: "classroomId" }])
  classroom: Classrooms;

  @ManyToOne(() => SchoolPeriods, (schoolPeriods) => schoolPeriods.classGroups)
  @JoinColumn([{ name: "year_period_id", referencedColumnName: "periodId" }])
  yearPeriod: SchoolPeriods;

  @ManyToOne(() => SchoolPeriods, (schoolPeriods) => schoolPeriods.classGroups2)
  @JoinColumn([{ name: "year_period_id", referencedColumnName: "periodId" }])
  yearPeriod_2: SchoolPeriods;

  @OneToMany(() => Courses, (courses) => courses.classGroup)
  courses: Courses[];

  @OneToMany(() => Enrollments, (enrollments) => enrollments.classGroup)
  enrollments: Enrollments[];
}
