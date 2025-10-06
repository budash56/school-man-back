// ORM mapping for the terms table generated from the current database schema.
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Grades } from '../grades/grades.entity';
import { SchoolYears } from '../school_years/school_years.entity';

@Index('terms_school_year_id_name_key', ['name', 'schoolYearId'], {
  unique: true,
})
@Index('terms_pkey', ['termId'], { unique: true })
@Entity('terms', { schema: 'public' })
export class Terms {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'term_id' })
  termId: string;

  @Column('bigint', { name: 'school_year_id', unique: true })
  schoolYearId: string;

  @Column('character varying', { name: 'name', unique: true, length: 20 })
  name: string;

  @Column('date', { name: 'start_date' })
  startDate: string;

  @Column('date', { name: 'end_date' })
  endDate: string;

  @Column('smallint', { name: 'sort_order' })
  sortOrder: number;

  @Column('boolean', { name: 'is_final', default: () => 'false' })
  isFinal: boolean;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @OneToMany(() => Grades, (grades) => grades.term)
  grades: Grades[];

  @ManyToOne(() => SchoolYears, (schoolYears) => schoolYears.terms, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    { name: 'school_year_id', referencedColumnName: 'schoolYearId' },
  ])
  schoolYear: SchoolYears;
}
