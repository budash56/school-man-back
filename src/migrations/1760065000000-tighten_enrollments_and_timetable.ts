import { MigrationInterface, QueryRunner } from 'typeorm';

export class TightenEnrollmentsAndTimetable1760065000000 implements MigrationInterface {
  name = 'TightenEnrollmentsAndTimetable1760065000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uniq_active_enrollment_per_year;`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_enrollment_student_year_active
      ON public.enrollments (student_id, school_year_id)
      WHERE active
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_timetable_classroom_slot
      ON public.timetable_assignments (slot_id, classroom_id)
      WHERE classroom_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uniq_timetable_classroom_slot;`);
    await queryRunner.query(`DROP INDEX IF EXISTS uniq_enrollment_student_year_active;`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_enrollment_per_year
      ON public.enrollments (school_year_id, student_id)
    `);
  }
}
