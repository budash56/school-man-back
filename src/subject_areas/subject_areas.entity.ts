// ORM mapping for the subject_areas table generated from the current database schema.
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Subjects } from '../subjects/subjects.entity';

@Index('subject_areas_pkey', ['areaId'], { unique: true })
@Index('subject_areas_code_key', ['code'], { unique: true })
@Index('subject_areas_name_key', ['name'], { unique: true })
@Entity('subject_areas', { schema: 'public' })
export class SubjectAreas {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'area_id' })
  areaId: string;

  @Column('character varying', { name: 'name', unique: true, length: 120 })
  name: string;

  @Column('character varying', {
    name: 'code',
    nullable: true,
    unique: true,
    length: 40,
  })
  code: string | null;

  @Column('boolean', {
    name: 'is_specialization',
    default: () => 'false',
  })
  isSpecialization: boolean;

  @OneToMany(() => Subjects, (subjects) => subjects.area)
  subjects: Subjects[];
}
