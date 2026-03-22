import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlanillaSheets1773700000000 implements MigrationInterface {
  name = 'AddPlanillaSheets1773700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.planilla_sheets (
        planilla_sheet_id bigserial NOT NULL,
        school_year_id bigint NOT NULL,
        class_group_id bigint,
        grade_level smallint NOT NULL,
        section character varying(10) NOT NULL,
        group_code character varying(10) NOT NULL,
        source_sheet character varying(80) NOT NULL,
        source_file_name character varying(255),
        template_key character varying(80) NOT NULL DEFAULT 'iedrc-secondary-v1',
        title character varying(150) NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        columns jsonb NOT NULL DEFAULT '[]'::jsonb,
        rows jsonb NOT NULL DEFAULT '[]'::jsonb,
        is_active boolean NOT NULL DEFAULT true,
        imported_by character varying(50),
        imported_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT planilla_sheets_pkey PRIMARY KEY (planilla_sheet_id),
        CONSTRAINT uq_planilla_sheets_year_group_template UNIQUE (school_year_id, group_code, template_key),
        CONSTRAINT fk_planilla_sheets_school_year FOREIGN KEY (school_year_id)
          REFERENCES public.school_years (school_year_id)
          ON DELETE CASCADE,
        CONSTRAINT fk_planilla_sheets_class_group FOREIGN KEY (class_group_id)
          REFERENCES public.class_groups (class_group_id)
          ON DELETE SET NULL,
        CONSTRAINT fk_planilla_sheets_imported_by FOREIGN KEY (imported_by)
          REFERENCES public.users (national_id)
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_planilla_sheets_grade_group
      ON public.planilla_sheets (grade_level, group_code)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_planilla_sheets_grade_group`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.planilla_sheets`);
  }
}
