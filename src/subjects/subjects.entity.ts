// ORM mapping for the subjects table generated from the current database schema.
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CourseInstances } from '../course_instances/course_instances.entity';
import { SubjectAreas } from '../subject_areas/subject_areas.entity';

@Index('subjects_subject_code_key', ['subjectCode'], { unique: true })
@Index('subjects_pkey', ['subjectId'], { unique: true })
@Entity('subjects', { schema: 'public' })
export class Subjects {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'subject_id' })
  subjectId: string;

  @Column('character varying', {
    name: 'subject_code',
    unique: true,
    length: 50,
  })
  subjectCode: string;

  @Column('character varying', { name: 'name', length: 120 })
  name: string;

  @Column('text', { name: 'description', nullable: true })
  description: string | null;

  @Column('bigint', { name: 'area_id' })
  areaId: string;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @OneToMany(
    () => CourseInstances,
    (courseInstances) => courseInstances.subject,
  )
  courseInstances: CourseInstances[];

  @ManyToOne(() => SubjectAreas, (subjectAreas) => subjectAreas.subjects, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn([{ name: 'area_id', referencedColumnName: 'areaId' }])
  area: SubjectAreas;
}
