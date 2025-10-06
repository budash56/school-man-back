// ORM mapping for the grade_scheme_values table generated from the current database schema.
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GradeSchemes } from '../grade_schemes/grade_schemes.entity';
import { Grades } from '../grades/grades.entity';

@Index('grade_scheme_values_scheme_id_code_key', ['code', 'schemeId'], {
  unique: true,
})
@Index('grade_scheme_values_pkey', ['valueId'], { unique: true })
@Entity('grade_scheme_values', { schema: 'public' })
export class GradeSchemeValues {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'value_id' })
  valueId: string;

  @Column('bigint', { name: 'scheme_id', unique: true })
  schemeId: string;

  @Column('character varying', { name: 'code', unique: true, length: 10 })
  code: string;

  @Column('character varying', { name: 'label', length: 50 })
  label: string;

  @Column('smallint', { name: 'sort_order' })
  sortOrder: number;

  @Column('boolean', { name: 'is_passing' })
  isPassing: boolean;

  @ManyToOne(
    () => GradeSchemes,
    (gradeSchemes) => gradeSchemes.gradeSchemeValues,
    { onDelete: 'CASCADE' }
  )
  @JoinColumn([{ name: 'scheme_id', referencedColumnName: 'schemeId' }])
  scheme: GradeSchemes;

  @OneToMany(() => Grades, (grades) => grades.schemeValue)
  grades: Grades[];
}
