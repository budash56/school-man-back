import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTimetableSlotsDuration1760070000000 implements MigrationInterface {
  name = 'UpdateTimetableSlotsDuration1760070000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.timetable_slots
      ADD COLUMN IF NOT EXISTS duration_minutes integer
    `);

    await queryRunner.query(`
      UPDATE public.timetable_slots
      SET duration_minutes = GREATEST(
        1,
        FLOOR(EXTRACT(EPOCH FROM (end_time - start_time)) / 60)
      )
      WHERE duration_minutes IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE public.timetable_slots
      ALTER COLUMN duration_minutes SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE public.timetable_slots
      DROP CONSTRAINT IF EXISTS chk_slot_time
    `);

    await queryRunner.query(`
      ALTER TABLE public.timetable_slots
      ADD CONSTRAINT chk_slot_time CHECK (end_time > start_time)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.timetable_slots
      DROP CONSTRAINT IF EXISTS chk_slot_time
    `);
    await queryRunner.query(`
      ALTER TABLE public.timetable_slots
      DROP COLUMN IF EXISTS duration_minutes
    `);
    await queryRunner.query(`
      ALTER TABLE public.timetable_slots
      ADD CONSTRAINT chk_slot_time CHECK (end_time > start_time)
    `);
  }
}
