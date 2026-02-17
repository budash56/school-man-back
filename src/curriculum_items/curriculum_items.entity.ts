// ORM mapping for the curriculum_items table.
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Curricula } from '../curricula/curricula.entity';
import { Subjects } from '../subjects/subjects.entity';

@Index('curriculum_items_pkey', ['curriculumItemId'], { unique: true })
@Index('curriculum_items_curriculum_subject_key', ['curriculumId', 'subjectId'], {
  unique: true,
})
@Entity('curriculum_items', { schema: 'public' })
export class CurriculumItems {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'curriculum_item_id' })
  curriculumItemId: string;

  @Column('bigint', { name: 'curriculum_id' })
  curriculumId: string;

  @Column('bigint', { name: 'subject_id' })
  subjectId: string;

  @Column('integer', { name: 'weekly_hours', default: () => '0' })
  weeklyHours: number;

  @Column('boolean', {
    name: 'double_session_required',
    default: () => 'false',
  })
  doubleSessionRequired: boolean;

  @Column('text', { name: 'notes', nullable: true })
  notes: string | null;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @ManyToOne(() => Curricula, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'curriculum_id', referencedColumnName: 'curriculumId' }])
  curriculum: Curricula;

  @ManyToOne(() => Subjects, { onDelete: 'RESTRICT' })
  @JoinColumn([{ name: 'subject_id', referencedColumnName: 'subjectId' }])
  subject: Subjects;
}
