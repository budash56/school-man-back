// ORM mapping for the grade_schemes table generated from the current database schema.
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { GradeSchemeValues } from '../grade_scheme_values/grade_scheme_values.entity';

@Index('grade_schemes_name_key', ['name'], { unique: true })
@Index('grade_schemes_pkey', ['schemeId'], { unique: true })
@Entity('grade_schemes', { schema: 'public' })
export class GradeSchemes {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'scheme_id' })
  schemeId: string;

  @Column('character varying', { name: 'name', unique: true, length: 40 })
  name: string;

  @Column('boolean', {
    name: 'is_active',
    nullable: true,
    default: () => 'true',
  })
  isActive: boolean | null;

  @Column('timestamp with time zone', {
    name: 'created_at',
    nullable: true,
    default: () => 'now()',
  })
  createdAt: Date | null;

  @OneToMany(
    () => GradeSchemeValues,
    (gradeSchemeValues) => gradeSchemeValues.scheme,
  )
  gradeSchemeValues: GradeSchemeValues[];
}
