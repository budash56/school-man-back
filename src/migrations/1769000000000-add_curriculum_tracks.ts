import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurriculumTracks1769000000000 implements MigrationInterface {
  name = 'AddCurriculumTracks1769000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.curricula
        ADD COLUMN IF NOT EXISTS track_name character varying(120);
    `);

    await queryRunner.query(`
      ALTER TABLE public.curricula
        DROP CONSTRAINT IF EXISTS curricula_grade_level_key;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS curricula_grade_level_key;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_curricula_grade_base
        ON public.curricula (grade_level)
        WHERE track_name IS NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_curricula_grade_track
        ON public.curricula (grade_level, track_name)
        WHERE track_name IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_curricula_grade_track;`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_curricula_grade_base;`);

    await queryRunner.query(`
      ALTER TABLE public.curricula
        ADD CONSTRAINT curricula_grade_level_key UNIQUE (grade_level);
    `);

    await queryRunner.query(`
      ALTER TABLE public.curricula
        DROP COLUMN IF EXISTS track_name;
    `);
  }
}
