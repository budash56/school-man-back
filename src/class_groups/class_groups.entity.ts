// ORM mapping for the class_groups table generated from the current database schema.
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Classrooms } from '../classrooms/classrooms.entity';
import { SchoolYears } from '../school_years/school_years.entity';
import { Courses } from '../courses/courses.entity';
import { Enrollments } from '../enrollments/enrollments.entity';

@Index('class_groups_pkey', ['classGroupId'], { unique: true })
@Index(
  'class_groups_school_year_id_grade_level_section_key',
  ['gradeLevel', 'schoolYearId', 'section'],
  { unique: true }
)
@Index('uniq_class_groups_year_code', ['schoolYearId'], { unique: true })
@Entity('class_groups', { schema: 'public' })
export class ClassGroups {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'class_group_id' })
  classGroupId: string;

  @Column('bigint', { name: 'school_year_id', unique: true })
  schoolYearId: string;

  @Column('smallint', { name: 'grade_level', unique: true })
  gradeLevel: number;

  @Column('character varying', { name: 'section', unique: true, length: 10 })
  section: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @ManyToOne(() => Classrooms, (classrooms) => classrooms.classGroups)
  @JoinColumn([{ name: 'classroom_id', referencedColumnName: 'classroomId' }])
  classroom: Classrooms;

  @OneToOne(() => SchoolYears, (schoolYears) => schoolYears.classGroups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'school_year_id', referencedColumnName: 'schoolYearId' },
  ])
  schoolYear: SchoolYears;

  @OneToMany(() => Courses, (courses) => courses.classGroup)
  courses: Courses[];

  @OneToMany(() => Enrollments, (enrollments) => enrollments.classGroup)
  enrollments: Enrollments[];
}
