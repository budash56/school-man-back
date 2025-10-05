import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Attendance } from "../attendance/Attendance.entity";
import { ClassGroups } from "../class_groups/ClassGroups.entity";
import { CourseInstances } from "../course_instances/CourseInstances.entity";
import { Users } from "../users/Users.entity";
import { Grades } from "../grades/Grades.entity";
import { TimetableAssignments } from "../timetable_assignments/TimetableAssignments.entity";

@Index(
  "courses_course_instance_id_teacher_id_class_group_id_key",
  ["classGroupId", "courseInstanceId", "teacherId"],
  { unique: true }
)
@Index("idx_courses_class_group", ["classGroupId"], {})
@Index("courses_pkey", ["courseId"], { unique: true })
@Index("idx_courses_teacher", ["teacherId"], {})
@Entity("courses", { schema: "public" })
export class Courses {
  @PrimaryGeneratedColumn({ type: "bigint", name: "course_id" })
  courseId: string;

  @Column("character varying", { name: "teacher_id", unique: true, length: 50 })
  teacherId: string;

  @Column("bigint", { name: "class_group_id", unique: true })
  classGroupId: string;

  @Column("timestamp with time zone", {
    name: "created_at",
    nullable: true,
    default: () => "now()",
  })
  createdAt: Date | null;

  @Column("bigint", {
    name: "course_instance_id",
    nullable: true,
    unique: true,
  })
  courseInstanceId: string | null;

  @OneToMany(() => Attendance, (attendance) => attendance.course)
  attendances: Attendance[];

  @ManyToOne(() => ClassGroups, (classGroups) => classGroups.courses)
  @JoinColumn([
    { name: "class_group_id", referencedColumnName: "classGroupId" },
  ])
  classGroup: ClassGroups;

  @ManyToOne(
    () => CourseInstances,
    (courseInstances) => courseInstances.courses
  )
  @JoinColumn([
    { name: "course_instance_id", referencedColumnName: "courseInstanceId" },
  ])
  courseInstance: CourseInstances;

  @ManyToOne(() => Users, (users) => users.courses)
  @JoinColumn([{ name: "teacher_id", referencedColumnName: "nationalId" }])
  teacher: Users;

  @OneToMany(() => Grades, (grades) => grades.course)
  grades: Grades[];

  @OneToMany(
    () => TimetableAssignments,
    (timetableAssignments) => timetableAssignments.course
  )
  timetableAssignments: TimetableAssignments[];
}
