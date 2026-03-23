import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlanillaImportClosed1773900000000 implements MigrationInterface {
  name = 'AddPlanillaImportClosed1773900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.planilla_sheets
      ADD COLUMN IF NOT EXISTS import_closed_at timestamp with time zone
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_planilla_sheets_import_closed_at
      ON public.planilla_sheets (import_closed_at)
    `);

    await queryRunner.query(`
      UPDATE public.planilla_sheets
      SET import_closed_at = COALESCE(updated_at, imported_at, now()),
          source_file_name = NULL
      WHERE import_closed_at IS NULL
        AND NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(public.planilla_sheets.rows, '[]'::jsonb)) AS row(elem)
          WHERE COALESCE(row.elem->>'retired', 'false') <> 'true'
            AND COALESCE(row.elem->>'status', '') <> 'resolved'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS public.idx_planilla_sheets_import_closed_at
    `);
    await queryRunner.query(`
      ALTER TABLE public.planilla_sheets
      DROP COLUMN IF EXISTS import_closed_at
    `);
  }
}
