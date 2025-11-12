// ORM mapping for the attendance table generated from the current database schema.
// Edited to use numeric IDs and partial unique indexes that model:
//  - legacy daily uniqueness when slot_id IS NULL
//  - per-slot uniqueness when slot_id IS NOT NULL

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
import { Students } from '../students/students.entity';
import { TimetableAssignments } from '../timetable_assignments/timetable_assignments.entity';

@Index('attendance_pkey', ['attendanceId'], { unique: true })
@Index('idx_attendance_course_date', ['courseId', 'date'])
@Index('idx_attendance_student_date', ['studentId', 'date'])
// ✅ legacy: only one record per (student, course, date) when there is NO slot
@Index(
  'ux_attendance_legacy_daily',
  ['studentId', 'courseId', 'date'],
  { unique: true, where: 'slot_id IS NULL' },
)
// ✅ modern: only one record per (student, course, date, slot) when there IS a slot
@Index(
  'ux_attendance_per_slot',
  ['studentId', 'courseId', 'date', 'slotId'],
  { unique: true, where: 'slot_id IS NOT NULL' },
)
@Entity('attendance', { schema: 'public' })
export class Attendance {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'attendance_id' })
  attendanceId: number;

  @Column('bigint', { name: 'student_id' })
  studentId: number;

  @Column('bigint', { name: 'course_id' })
  courseId: number;

  // Stored as DATE in DB; keep string 'YYYY-MM-DD' here
  @Column('date', { name: 'date' })
  date: string;

  @Column({
    type: 'enum',
    enum: ['P', 'A', 'AE'],
    enumName: 'attendance_status',
    name: 'status',
  })
  status: 'P' | 'A' | 'AE';

  @Column('text', { name: 'reason_note', nullable: true })
  reasonNote: string | null;

  @Column('timestamp with time zone', {
    name: 'recorded_at',
    nullable: true,
    default: () => 'now()',
  })
  recordedAt: Date | null;

  @Column('timestamp with time zone', { name: 'excused_at', nullable: true })
  excusedAt: Date | null;

  @Column('timestamp with time zone', { name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @Column('bigint', { name: 'slot_id', nullable: true })
  slotId: number | null;

  @ManyToOne(() => Courses, (courses) => courses.attendances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'course_id', referencedColumnName: 'courseId' }])
  course: Courses;

  @ManyToOne(() => Users, (users) => users.attendances)
  @JoinColumn([{ name: 'excused_by', referencedColumnName: 'nationalId' }])
  excusedBy: Users;

  @ManyToOne(() => Users, (users) => users.attendances2)
  @JoinColumn([{ name: 'recorded_by', referencedColumnName: 'nationalId' }])
  recordedBy: Users;

  @ManyToOne(() => Students, (students) => students.attendances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'student_id', referencedColumnName: 'studentId' }])
  student: Students;

  @ManyToOne(
    () => TimetableAssignments,
    (timetableAssignments) => timetableAssignments.attendances,
  )
  @JoinColumn([
    { name: 'course_id', referencedColumnName: 'courseId' },
    { name: 'slot_id', referencedColumnName: 'slotId' },
  ])
  timetableAssignments: TimetableAssignments;
}
