// ORM mapping for the enrollments table generated from the current database schema.
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClassGroups } from '../class_groups/class_groups.entity';
import { SchoolYears } from '../school_years/school_years.entity';
import { Students } from '../students/students.entity';

@Index(
  'enrollments_student_id_class_group_id_school_year_id_key',
  ['classGroupId', 'schoolYearId', 'studentId'],
  { unique: true },
)
@Index('enrollments_pkey', ['enrollmentId'], { unique: true })
@Index('idx_enrollments_year', ['schoolYearId'], {})
@Index('uniq_active_enrollment_per_year', ['schoolYearId', 'studentId'], {
  unique: true,
})
@Index('idx_enrollments_student', ['studentId'], {})
@Entity('enrollments', { schema: 'public' })
export class Enrollments {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'enrollment_id' })
  enrollmentId: string;

  @Column('bigint', { name: 'student_id' })
  studentId: string;

  @Column('bigint', { name: 'class_group_id' })
  classGroupId: string;

  @Column('bigint', { name: 'school_year_id' })
  schoolYearId: string;

  @Column('timestamp with time zone', {
    name: 'enrolled_at',
    nullable: true,
    default: () => 'now()',
  })
  enrolledAt: Date | null;

  @Column('boolean', { name: 'active', nullable: true, default: () => 'true' })
  active: boolean | null;

  @ManyToOne(() => ClassGroups, (classGroups) => classGroups.enrollments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'class_group_id', referencedColumnName: 'classGroupId' },
  ])
  classGroup: ClassGroups;

  @ManyToOne(() => SchoolYears, (schoolYears) => schoolYears.enrollments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'school_year_id', referencedColumnName: 'schoolYearId' },
  ])
  schoolYear: SchoolYears;

  @ManyToOne(() => Students, (students) => students.enrollments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'student_id', referencedColumnName: 'studentId' }])
  student: Students;
}
