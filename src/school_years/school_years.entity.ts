// ORM mapping for the school_years table generated from the current database schema.
import {
  Column,
  Entity,
  Index,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClassGroups } from '../class_groups/class_groups.entity';
import { CourseInstances } from '../course_instances/course_instances.entity';
import { Enrollments } from '../enrollments/enrollments.entity';
import { Terms } from '../terms/terms.entity';

@Index('school_years_name_key', ['name'], { unique: true })
@Index('school_years_pkey', ['schoolYearId'], { unique: true })
@Entity('school_years', { schema: 'public' })
export class SchoolYears {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'school_year_id' })
  schoolYearId: string;

  @Column('character varying', { name: 'name', unique: true, length: 20 })
  name: string;

  @Column('date', { name: 'year_start' })
  yearStart: string;

  @Column('date', { name: 'year_end' })
  yearEnd: string;

  @Column('boolean', { name: 'is_active', default: () => 'true' })
  isActive: boolean;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @OneToOne(() => ClassGroups, (classGroups) => classGroups.schoolYear)
  classGroups: ClassGroups;

  @OneToMany(
    () => CourseInstances,
    (courseInstances) => courseInstances.schoolYear,
  )
  courseInstances: CourseInstances[];

  @OneToMany(() => Enrollments, (enrollments) => enrollments.schoolYear)
  enrollments: Enrollments[];

  @OneToMany(() => Terms, (terms) => terms.schoolYear)
  terms: Terms[];
}
