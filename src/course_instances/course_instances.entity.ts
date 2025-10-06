// ORM mapping for the course_instances table generated from the current database schema.
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SchoolYears } from '../school_years/school_years.entity';
import { Subjects } from '../subjects/subjects.entity';
import { Courses } from '../courses/courses.entity';

@Index(
  'course_instances_course_code_school_year_id_key',
  ['courseCode', 'schoolYearId'],
  { unique: true }
)
@Index('course_instances_pkey', ['courseInstanceId'], { unique: true })
@Index(
  'course_instances_subject_id_grade_level_school_year_id_key',
  ['gradeLevel', 'schoolYearId', 'subjectId'],
  { unique: true }
)
@Entity('course_instances', { schema: 'public' })
export class CourseInstances {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'course_instance_id' })
  courseInstanceId: string;

  @Column('bigint', { name: 'subject_id' })
  subjectId: string;

  @Column('smallint', { name: 'grade_level' })
  gradeLevel: number;

  @Column('bigint', { name: 'school_year_id' })
  schoolYearId: string;

  @Column('integer', { name: 'weekly_hours', default: () => '0' })
  weeklyHours: number;

  @Column('character varying', {
    name: 'course_code',
    unique: true,
    length: 50,
  })
  courseCode: string;

  @Column('character varying', { name: 'course_name', length: 120 })
  courseName: string;

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @Column('boolean', {
    name: 'is_active',
    nullable: true,
    default: () => 'true',
  })
  isActive: boolean | null;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @ManyToOne(() => SchoolYears, (schoolYears) => schoolYears.courseInstances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'school_year_id', referencedColumnName: 'schoolYearId' },
  ])
  schoolYear: SchoolYears;

  @ManyToOne(() => Subjects, (subjects) => subjects.courseInstances, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn([{ name: 'subject_id', referencedColumnName: 'subjectId' }])
  subject: Subjects;

  @OneToMany(() => Courses, (courses) => courses.courseInstance)
  courses: Courses[];
}
