// ORM mapping for the attendance table generated from the current database schema.
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
@Index('idx_attendance_course_date', ['courseId', 'date'], {})
@Index(
  'attendance_student_id_course_id_date_key',
  ['courseId', 'date', 'studentId'],
  { unique: true },
)
@Index('idx_attendance_student_date', ['date', 'studentId'], {})
@Index('uniq_attendance_student_date_slot', ['date', 'slotId', 'studentId'], {
  unique: true,
})
@Entity('attendance', { schema: 'public' })
export class Attendance {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'attendance_id' })
  attendanceId: string;

  @Column('bigint', { name: 'student_id' })
  studentId: string;

  @Column('bigint', { name: 'course_id' })
  courseId: string;

  @Column('date', { name: 'date' })
  date: string;

  @Column('enum', { name: 'status', enum: ['P', 'A', 'AE'] })
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
  slotId: string | null;

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
