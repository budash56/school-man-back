// ORM mapping for the classrooms table generated from the current database schema.
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ClassGroups } from '../class_groups/class_groups.entity';
import { TimetableAssignments } from '../timetable_assignments/timetable_assignments.entity';
import { Buildings } from '../buildings/buildings.entity';

@Index('classrooms_pkey', ['classroomId'], { unique: true })
@Index('classrooms_name_key', ['name'], { unique: true })
@Entity('classrooms', { schema: 'public' })
export class Classrooms {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'classroom_id' })
  classroomId: string;

  @Column('character varying', { name: 'name', unique: true, length: 80 })
  name: string;

  @Column('bigint', { name: 'building_id', nullable: true })
  buildingId: string | null;

  @Column('integer', { name: 'capacity', default: () => '0' })
  capacity: number;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @OneToMany(() => ClassGroups, (classGroups) => classGroups.classroom)
  classGroups: ClassGroups[];

  @ManyToOne(() => Buildings, (buildings) => buildings.classrooms, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn([{ name: 'building_id', referencedColumnName: 'buildingId' }])
  building: Buildings | null;

  @OneToMany(
    () => TimetableAssignments,
    (timetableAssignments) => timetableAssignments.classroom,
  )
  timetableAssignments: TimetableAssignments[];
}
