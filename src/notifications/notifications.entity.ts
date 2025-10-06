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

@Index('idx_notifications_target', ['createdAt', 'targetRole'], {})
@Index('notifications_pkey', ['notificationId'], { unique: true })
@Entity('notifications', { schema: 'public' })
export class Notifications {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'notification_id' })
  notificationId: string;

  @Column('character varying', { name: 'type', length: 40 })
  type: string;

  @Column('jsonb', { name: 'payload' })
  payload: object;

  @Column('enum', {
    name: 'target_role',
    enum: ['admin', 'registrar', 'teacher', 'coordinator'],
  })
  targetRole: 'admin' | 'registrar' | 'teacher' | 'coordinator';

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @Column('timestamp with time zone', { name: 'read_at', nullable: true })
  readAt: Date | null;

  @ManyToOne(() => Users, (users) => users.notifications)
  @JoinColumn([{ name: 'created_by', referencedColumnName: 'nationalId' }])
  createdBy: Users;
}
