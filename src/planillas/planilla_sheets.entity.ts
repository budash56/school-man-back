import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ClassGroups } from '../class_groups/class_groups.entity';
import { SchoolYears } from '../school_years/school_years.entity';
import { Users } from '../users/users.entity';

@Index('planilla_sheets_pkey', ['planillaSheetId'], { unique: true })
@Index('uq_planilla_sheets_year_group_template', ['schoolYearId', 'groupCode', 'templateKey'], {
  unique: true,
})
@Entity('planilla_sheets', { schema: 'public' })
export class PlanillaSheets {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'planilla_sheet_id' })
  planillaSheetId: string;

  @Column('bigint', { name: 'school_year_id' })
  schoolYearId: string;

  @Column('bigint', { name: 'class_group_id', nullable: true })
  classGroupId: string | null;

  @Column('smallint', { name: 'grade_level' })
  gradeLevel: number;

  @Column('character varying', { name: 'section', length: 10 })
  section: string;

  @Column('character varying', { name: 'group_code', length: 10 })
  groupCode: string;

  @Column('character varying', { name: 'source_sheet', length: 80 })
  sourceSheet: string;

  @Column('character varying', { name: 'source_file_name', length: 255, nullable: true })
  sourceFileName: string | null;

  @Column('character varying', {
    name: 'template_key',
    length: 80,
    default: () => "'iedrc-secondary-v1'",
  })
  templateKey: string;

  @Column('character varying', { name: 'title', length: 150 })
  title: string;

  @Column('jsonb', { name: 'metadata', default: () => "'{}'::jsonb" })
  metadata: Record<string, unknown>;

  @Column('jsonb', { name: 'columns', default: () => "'[]'::jsonb" })
  columns: Array<Record<string, unknown>>;

  @Column('jsonb', { name: 'rows', default: () => "'[]'::jsonb" })
  rows: Array<Record<string, unknown>>;

  @Column('boolean', { name: 'is_active', default: () => 'true' })
  isActive: boolean;

  @Column('character varying', { name: 'imported_by', length: 50, nullable: true })
  importedById: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone', name: 'imported_at', default: () => 'now()' })
  importedAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone', name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;

  @ManyToOne(() => SchoolYears, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'school_year_id', referencedColumnName: 'schoolYearId' }])
  schoolYear: SchoolYears;

  @ManyToOne(() => ClassGroups, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn([{ name: 'class_group_id', referencedColumnName: 'classGroupId' }])
  classGroup: ClassGroups | null;

  @ManyToOne(() => Users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn([{ name: 'imported_by', referencedColumnName: 'nationalId' }])
  importedBy: Users | null;
}
