// ORM mapping for the disciplinary_records table generated from the current database schema.
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Users } from '../users/users.entity';
import { Students } from '../students/students.entity';

@Index('disciplinary_records_pkey', ['disciplinaryId'], { unique: true })
@Entity('disciplinary_records', { schema: 'public' })
export class DisciplinaryRecords {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'disciplinary_id' })
  disciplinaryId: string;

  @Column('date', { name: 'date_happened' })
  dateHappened: string;

  @Column('enum', {
    name: 'category',
    enum: ['green', 'yellow', 'red', 'last_notice'],
  })
  category: 'green' | 'yellow' | 'red' | 'last_notice';

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @Column('date', { name: 'expires_at', nullable: true })
  expiresAt: string | null;

  @Column('timestamp with time zone', { name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => Users, (users) => users.disciplinaryRecords)
  @JoinColumn([{ name: 'recorded_by', referencedColumnName: 'nationalId' }])
  recordedBy: Users;

  @ManyToOne(() => Students, (students) => students.disciplinaryRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'student_id', referencedColumnName: 'studentId' }])
  student: Students;
}
