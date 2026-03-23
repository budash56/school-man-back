import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SchoolYears } from '../school_years/school_years.entity';
import { Users } from '../users/users.entity';

@Index('calendar_events_pkey', ['calendarEventId'], { unique: true })
@Index('idx_calendar_events_school_year_dates', ['schoolYearId', 'startDate', 'endDate'], {})
@Entity('calendar_events', { schema: 'public' })
export class CalendarEvents {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'calendar_event_id' })
  calendarEventId: string;

  @Column('bigint', { name: 'school_year_id' })
  schoolYearId: string;

  @Column('character varying', { name: 'category', length: 40 })
  category: string;

  @Column('character varying', { name: 'kind', length: 40 })
  kind: string;

  @Column('character varying', { name: 'title', length: 160 })
  title: string;

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @Column('date', { name: 'start_date' })
  startDate: string;

  @Column('date', { name: 'end_date' })
  endDate: string;

  @Column('character varying', { name: 'visibility_scope', length: 40 })
  visibilityScope: string;

  @Column('text', {
    name: 'target_teacher_ids',
    array: true,
    nullable: true,
    default: () => 'ARRAY[]::text[]',
  })
  targetTeacherIds: string[] | null;

  @Column('text', {
    name: 'target_area_ids',
    array: true,
    nullable: true,
    default: () => 'ARRAY[]::text[]',
  })
  targetAreaIds: string[] | null;

  @Column('text', {
    name: 'target_class_group_ids',
    array: true,
    nullable: true,
    default: () => 'ARRAY[]::text[]',
  })
  targetClassGroupIds: string[] | null;

  @Column('character varying', {
    name: 'created_by',
    nullable: true,
    length: 50,
  })
  createdById: string | null;

  @Column('character varying', {
    name: 'created_by_role',
    nullable: true,
    length: 30,
  })
  createdByRole: string | null;

  @Column('boolean', { name: 'is_active', default: () => 'true' })
  isActive: boolean;

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

  @ManyToOne(() => SchoolYears, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'school_year_id', referencedColumnName: 'schoolYearId' }])
  schoolYear: SchoolYears;

  @ManyToOne(() => Users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn([{ name: 'created_by', referencedColumnName: 'nationalId' }])
  createdBy: Users | null;
}
