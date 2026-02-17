// ORM mapping for the curricula table.
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CurriculumItems } from '../curriculum_items/curriculum_items.entity';

@Index('curricula_pkey', ['curriculumId'], { unique: true })
@Index('curricula_grade_level_key', ['gradeLevel'], { unique: true })
@Entity('curricula', { schema: 'public' })
export class Curricula {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'curriculum_id' })
  curriculumId: string;

  @Column('smallint', { name: 'grade_level' })
  gradeLevel: number;

  @Column('character varying', { name: 'name', length: 120 })
  name: string;

  @Column('boolean', { name: 'is_active', default: () => 'true' })
  isActive: boolean;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @OneToMany(() => CurriculumItems, (items) => items.curriculum)
  items: CurriculumItems[];
}
