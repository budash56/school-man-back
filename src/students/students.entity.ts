// ORM mapping for the students table generated from the current database schema.
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Attendance } from '../attendance/attendance.entity';
import { DisciplinaryRecords } from '../disciplinary_records/disciplinary_records.entity';
import { Enrollments } from '../enrollments/enrollments.entity';
import { Grades } from '../grades/grades.entity';

@Index('students_national_id_key', ['nationalId'], { unique: true })
@Index('students_pkey', ['studentId'], { unique: true })
@Entity('students', { schema: 'public' })
export class Students {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'student_id' })
  studentId: string;

  @Column('character varying', {
    name: 'national_id',
    unique: true,
    length: 50,
  })
  nationalId: string;

  @Column('character varying', { name: 'first_name', length: 80 })
  firstName: string;

  @Column('character varying', { name: 'last_name', length: 80 })
  lastName: string;

  @Column('date', { name: 'dob', nullable: true })
  dob: string | null;

  @Column('text', { name: 'address', nullable: true })
  address: string | null;

  @Column('character varying', {
    name: 'guardian_name',
    nullable: true,
    length: 120,
  })
  guardianName: string | null;

  @Column('character varying', {
    name: 'guardian_relationship',
    nullable: true,
    length: 60,
  })
  guardianRelationship: string | null;

  @Column('character varying', { name: 'guardian_phone', length: 50 })
  guardianPhone: string;

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

  @Column('timestamp with time zone', {
    name: 'updated_at',
    nullable: true,
    default: () => 'now()',
  })
  updatedAt: Date | null;

  @Column('timestamp with time zone', { name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => Attendance, (attendance) => attendance.student)
  attendances: Attendance[];

  @OneToMany(
    () => DisciplinaryRecords,
    (disciplinaryRecords) => disciplinaryRecords.student
  )
  disciplinaryRecords: DisciplinaryRecords[];

  @OneToMany(() => Enrollments, (enrollments) => enrollments.student)
  enrollments: Enrollments[];

  @OneToMany(() => Grades, (grades) => grades.student)
  grades: Grades[];
}
