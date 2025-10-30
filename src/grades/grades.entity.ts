// ORM mapping for the grades table generated from the current database schema.
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Courses } from '../courses/courses.entity';
import { Users } from '../users/users.entity';
import { GradeSchemeValues } from '../grade_scheme_values/grade_scheme_values.entity';
import { Students } from '../students/students.entity';
import { Terms } from '../terms/terms.entity';

@Index(
  'grades_student_id_course_id_term_id_key',
  ['courseId', 'studentId', 'termId'],
  { unique: true }
)
@Index('grades_pkey', ['gradeId'], { unique: true })
@Entity('grades', { schema: 'public' })
export class Grades {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'grade_id' })
  gradeId: string;

  @Column('bigint', { name: 'student_id' })
  studentId: string;

  @Column('bigint', { name: 'course_id' })
  courseId: string;

  @Column('bigint', { name: 'term_id' })
  termId: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @Column('enum', { name: 'mark', enum: ['S', 'A', 'B', 'J'] })
  mark: 'S' | 'A' | 'B' | 'J';

  @Column('text', { name: 'comment', nullable: true })
  comment: string | null;

  @ManyToOne(() => Courses, (courses) => courses.grades, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'course_id', referencedColumnName: 'courseId' }])
  course: Courses;

  @ManyToOne(() => Users, (users) => users.grades)
  @JoinColumn([{ name: 'recorded_by', referencedColumnName: 'nationalId' }])
  recordedBy: Users;

  @ManyToOne(
    () => GradeSchemeValues,
    (gradeSchemeValues) => gradeSchemeValues.grades,
    { onDelete: 'RESTRICT' }
  )
  @JoinColumn([{ name: 'scheme_value_id', referencedColumnName: 'valueId' }])
  schemeValue: GradeSchemeValues;

  @ManyToOne(() => Students, (students) => students.grades, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'student_id', referencedColumnName: 'studentId' }])
  student: Students;

  @ManyToOne(() => Terms, (terms) => terms.grades, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'term_id', referencedColumnName: 'termId' }])
  term: Terms;
}
