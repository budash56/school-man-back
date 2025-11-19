import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTimetableDivision1763584000000 implements MigrationInterface {
  name = 'AddTimetableDivision1763584000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.timetable_slots
      ADD COLUMN IF NOT EXISTS division character varying(20) NOT NULL DEFAULT 'elementary'
    `);

    await queryRunner.query(`
      UPDATE public.timetable_slots
      SET division = 'elementary'
      WHERE division IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE public.timetable_slots
      DROP CONSTRAINT IF EXISTS chk_timetable_slots_division
    `);

    await queryRunner.query(`
      ALTER TABLE public.timetable_slots
      ADD CONSTRAINT chk_timetable_slots_division CHECK (
        division IN ('elementary', 'secondary', 'senior')
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.timetable_slots
      DROP CONSTRAINT IF EXISTS chk_timetable_slots_division
    `);
    await queryRunner.query(`
      ALTER TABLE public.timetable_slots
      DROP COLUMN IF EXISTS division
    `);
  }
}
