// ORM mapping for the buildings table.
import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Classrooms } from '../classrooms/classrooms.entity';

@Index('buildings_pkey', ['buildingId'], { unique: true })
@Index('buildings_name_key', ['name'], { unique: true })
@Entity('buildings', { schema: 'public' })
export class Buildings {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'building_id' })
  buildingId: string;

  @Column('character varying', { name: 'name', unique: true, length: 80 })
  name: string;

  @Column('boolean', { name: 'is_lab', default: () => 'false' })
  isLab: boolean;

  @Column('boolean', { name: 'is_auditorium', default: () => 'false' })
  isAuditorium: boolean;

  @Column('boolean', { name: 'is_computer_room', default: () => 'false' })
  isComputerRoom: boolean;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @OneToMany(() => Classrooms, (classrooms) => classrooms.building)
  classrooms: Classrooms[];
}
