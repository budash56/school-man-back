import { MigrationInterface, QueryRunner } from 'typeorm';

export class AttendanceUniquenessGuardrails1763608000000 implements MigrationInterface {
  name = 'AttendanceUniquenessGuardrails1763608000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS uniq_attendance_student_date_slot`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS uniq_attendance_student_date_slot`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_attendance_legacy_daily
        ON public.attendance (student_id, course_id, date)
        WHERE slot_id IS NULL`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_attendance_per_slot
        ON public.attendance (student_id, course_id, date, slot_id)
        WHERE slot_id IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS ux_attendance_per_slot`);
    await queryRunner.query(`DROP INDEX IF EXISTS ux_attendance_legacy_daily`);

    await queryRunner.query(
      `ALTER TABLE public.attendance
        ADD CONSTRAINT uniq_attendance_student_date_slot
        UNIQUE (student_id, date, slot_id)`,
    );
  }
}
