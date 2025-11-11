// ORM mapping for the timetable_assignments table generated from the current database schema.
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
import { Classrooms } from '../classrooms/classrooms.entity';
import { Courses } from '../courses/courses.entity';
import { TimetableSlot } from '../timetable_slots/timetable_slots.entity';

@Index('timetable_assignments_pkey', ['assignmentId'], { unique: true })
@Index('uniq_classgroup_slot', ['classGroupId', 'slotId'], { unique: true })
@Index('timetable_assignments_course_id_slot_id_key', ['courseId', 'slotId'], {
  unique: true,
})
@Index('uniq_teacher_slot', ['slotId', 'teacherId'], { unique: true })
@Entity('timetable_assignments', { schema: 'public' })
export class TimetableAssignments {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'assignment_id' })
  assignmentId: string;

  @Column('bigint', { name: 'course_id' })
  courseId: string;

  @Column('bigint', { name: 'slot_id', nullable: true })
  slotId: string | null;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @Column('character varying', {
    name: 'teacher_id',
    nullable: true,
    length: 50,
  })
  teacherId: string | null;

  @Column('bigint', { name: 'class_group_id', nullable: true })
  classGroupId: string | null;

  @OneToMany(() => Attendance, (attendance) => attendance.timetableAssignments)
  attendances: Attendance[];

  @ManyToOne(() => Classrooms, (classrooms) => classrooms.timetableAssignments)
  @JoinColumn([{ name: 'classroom_id', referencedColumnName: 'classroomId' }])
  classroom: Classrooms;

  @ManyToOne(() => Courses, (courses) => courses.timetableAssignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'course_id', referencedColumnName: 'courseId' }])
  course: Courses;

  @ManyToOne(
    () => TimetableSlot,
    (timetableSlots) => timetableSlots.timetableAssignments,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn([{ name: 'slot_id', referencedColumnName: 'slotId' }])
  slot: TimetableSlot;
}
