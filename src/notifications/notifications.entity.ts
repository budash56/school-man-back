// ORM mapping for the notifications table generated from the current database schema.
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

@Index('notifications_pkey', ['notificationId'], { unique: true })
@Entity('notifications', { schema: 'public' })
export class Notifications {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'notification_id' })
  notificationId: string;

  @Column('bigint', { name: 'student_id', nullable: true })
  studentId: string | null;

  @Column('character varying', { name: 'title', length: 120 })
  title: string;

  @Column('text', { name: 'message', nullable: true })
  message: string | null;

  @Column('boolean', { name: 'is_active', default: () => 'true' })
  isActive: boolean;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @ManyToOne(() => Users, (users) => users.notifications, { nullable: true })
  @JoinColumn([{ name: 'created_by', referencedColumnName: 'nationalId' }])
  createdBy: Users | null;

  @Column('character varying', {
    name: 'category',
    length: 40,
    default: () => "'general'",
  })
  category: string;

  @ManyToOne(() => Students, { nullable: true })
  @JoinColumn([{ name: 'student_id', referencedColumnName: 'studentId' }])
  student: Students | null;
}
