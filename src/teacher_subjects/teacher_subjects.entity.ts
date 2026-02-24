// ORM mapping for the teacher_subjects table.
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Users } from '../users/users.entity';
import { Subjects } from '../subjects/subjects.entity';

@Index('teacher_subjects_pkey', ['teacherSubjectId'], { unique: true })
@Index('teacher_subjects_teacher_subject_key', ['teacherId', 'subjectId'], {
  unique: true,
})
@Entity('teacher_subjects', { schema: 'public' })
export class TeacherSubjects {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'teacher_subject_id' })
  teacherSubjectId: string;

  @Column('character varying', { name: 'teacher_id', length: 50 })
  teacherId: string;

  @Column('bigint', { name: 'subject_id' })
  subjectId: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @ManyToOne(() => Users, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'teacher_id', referencedColumnName: 'nationalId' }])
  teacher: Users;

  @ManyToOne(() => Subjects, { onDelete: 'RESTRICT' })
  @JoinColumn([{ name: 'subject_id', referencedColumnName: 'subjectId' }])
  subject: Subjects;
}
