// ORM mapping for the curricula table.
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CurriculumItems } from '../curriculum_items/curriculum_items.entity';
import { SubjectAreas } from '../subject_areas/subject_areas.entity';

@Index('curricula_pkey', ['curriculumId'], { unique: true })
@Entity('curricula', { schema: 'public' })
export class Curricula {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'curriculum_id' })
  curriculumId: string;

  @Column('smallint', { name: 'grade_level' })
  gradeLevel: number;

  @Column('character varying', { name: 'name', length: 120 })
  name: string;

  @Column('character varying', {
    name: 'track_name',
    length: 120,
    nullable: true,
  })
  trackName: string | null;

  @Column('bigint', { name: 'specialization_area_id', nullable: true })
  specializationAreaId: string | null;

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

  @ManyToOne(() => SubjectAreas, { onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'specialization_area_id', referencedColumnName: 'areaId' },
  ])
  specializationArea: SubjectAreas | null;
}
