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
import { ClassGroups } from '../class_groups/class_groups.entity';
import { CurriculumItems } from '../curriculum_items/curriculum_items.entity';
import { SchoolYears } from '../school_years/school_years.entity';
import { Subjects } from '../subjects/subjects.entity';
import { Courses } from '../courses/courses.entity';

@Index(
  'course_instances_course_code_school_year_id_key',
  ['courseCode', 'schoolYearId'],
  { unique: true },
)
@Index('course_instances_pkey', ['courseInstanceId'], { unique: true })
@Index(
  'ux_course_instances_grade_scope',
  ['subjectId', 'gradeLevel', 'schoolYearId'],
  { unique: true, where: "scope_type = 'GRADE'" },
)
@Index(
  'ux_course_instances_class_group_scope',
  ['subjectId', 'classGroupId', 'schoolYearId'],
  { unique: true, where: "scope_type = 'CLASS_GROUP'" },
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

  @Column('bigint', { name: 'class_group_id', nullable: true })
  classGroupId: string | null;

  @Column({
    type: 'enum',
    enum: ['GRADE', 'CLASS_GROUP'],
    enumName: 'course_instance_scope',
    name: 'scope_type',
    default: () => "'GRADE'",
  })
  scopeType: 'GRADE' | 'CLASS_GROUP';

  @Column('bigint', { name: 'curriculum_item_id', nullable: true })
  curriculumItemId: string | null;

  @Column('integer', { name: 'weekly_hours', default: () => '0' })
  weeklyHours: number;

  @Column('boolean', {
    name: 'double_session_required',
    default: () => 'false',
  })
  doubleSessionRequired: boolean;

  @Column('character varying', {
    name: 'course_code',
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

  @ManyToOne(() => ClassGroups, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'class_group_id', referencedColumnName: 'classGroupId' },
  ])
  classGroup: ClassGroups;

  @ManyToOne(() => CurriculumItems, { onDelete: 'SET NULL' })
  @JoinColumn([
    { name: 'curriculum_item_id', referencedColumnName: 'curriculumItemId' },
  ])
  curriculumItem: CurriculumItems;

  @OneToMany(() => Courses, (courses) => courses.courseInstance)
  courses: Courses[];
}
