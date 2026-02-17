// ORM mapping for the class_group_curriculum_overrides table.
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClassGroups } from '../class_groups/class_groups.entity';
import { CurriculumItems } from '../curriculum_items/curriculum_items.entity';

@Index('class_group_curriculum_overrides_pkey', ['overrideId'], { unique: true })
@Index(
  'class_group_curriculum_overrides_group_item_key',
  ['classGroupId', 'curriculumItemId'],
  { unique: true },
)
@Entity('class_group_curriculum_overrides', { schema: 'public' })
export class ClassGroupCurriculumOverrides {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'override_id' })
  overrideId: string;

  @Column('bigint', { name: 'class_group_id' })
  classGroupId: string;

  @Column('bigint', { name: 'curriculum_item_id' })
  curriculumItemId: string;

  @Column('integer', { name: 'weekly_hours_override', nullable: true })
  weeklyHoursOverride: number | null;

  @Column('boolean', { name: 'double_session_override', nullable: true })
  doubleSessionOverride: boolean | null;

  @Column('boolean', { name: 'is_disabled', default: () => 'false' })
  isDisabled: boolean;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @ManyToOne(() => ClassGroups, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'class_group_id', referencedColumnName: 'classGroupId' }])
  classGroup: ClassGroups;

  @ManyToOne(() => CurriculumItems, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'curriculum_item_id', referencedColumnName: 'curriculumItemId' },
  ])
  curriculumItem: CurriculumItems;
}
