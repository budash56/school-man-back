// ORM mapping for fixed classroom locations per grade/section.
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Classrooms } from '../classrooms/classrooms.entity';

@Index('class_group_fixed_locations_pkey', ['fixedLocationId'], { unique: true })
@Index('class_group_fixed_locations_grade_section_key', ['gradeLevel', 'section'], {
  unique: true,
})
@Entity('class_group_fixed_locations', { schema: 'public' })
export class ClassGroupFixedLocations {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'fixed_location_id' })
  fixedLocationId: string;

  @Column('smallint', { name: 'grade_level' })
  gradeLevel: number;

  @Column('character varying', { name: 'section', length: 10 })
  section: string;

  @Column('bigint', { name: 'classroom_id' })
  classroomId: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @ManyToOne(() => Classrooms, { onDelete: 'RESTRICT' })
  @JoinColumn([{ name: 'classroom_id', referencedColumnName: 'classroomId' }])
  classroom: Classrooms;
}
