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

@Index('notifications_pkey', ['notificationId'], { unique: true })
@Entity('notifications', { schema: 'public' })
export class Notifications {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'notification_id' })
  notificationId: string;

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
}
