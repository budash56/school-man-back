// ORM mapping for the courses table generated from the current database schema.
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Attendance } from '../attendance/attendance.entity';
import { ClassGroups } from '../class_groups/class_groups.entity';
import { CourseInstances } from '../course_instances/course_instances.entity';
import { Users } from '../users/users.entity';
import { Grades } from '../grades/grades.entity';
import { TimetableAssignments } from '../timetable_assignments/timetable_assignments.entity';

@Index(
  'courses_course_instance_id_class_group_id_teacher_id_key',
  ['classGroupId', 'courseInstanceId', 'teacherId'],
  { unique: true }
)
@Index('courses_pkey', ['courseId'], { unique: true })
@Entity('courses', { schema: 'public' })
export class Courses {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'course_id' })
  courseId: string;

  @Column('bigint', { name: 'course_instance_id' })
  courseInstanceId: string;

  @Column('bigint', { name: 'class_group_id' })
  classGroupId: string;

  @Column('character varying', { name: 'teacher_id', length: 50 })
  teacherId: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @OneToMany(() => Attendance, (attendance) => attendance.course)
  attendances: Attendance[];

  @ManyToOne(() => ClassGroups, (classGroups) => classGroups.courses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'class_group_id', referencedColumnName: 'classGroupId' },
  ])
  classGroup: ClassGroups;

  @ManyToOne(
    () => CourseInstances,
    (courseInstances) => courseInstances.courses,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn([
    { name: 'course_instance_id', referencedColumnName: 'courseInstanceId' },
  ])
  courseInstance: CourseInstances;

  @ManyToOne(() => Users, (users) => users.courses, { onDelete: 'RESTRICT' })
  @JoinColumn([{ name: 'teacher_id', referencedColumnName: 'nationalId' }])
  teacher: Users;

  @OneToMany(() => Grades, (grades) => grades.course)
  grades: Grades[];

  @OneToMany(
    () => TimetableAssignments,
    (timetableAssignments) => timetableAssignments.course
  )
  timetableAssignments: TimetableAssignments[];
}
