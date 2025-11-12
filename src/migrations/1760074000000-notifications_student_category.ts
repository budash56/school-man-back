import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationsStudentCategory1760074000000
  implements MigrationInterface
{
  name = 'NotificationsStudentCategory1760074000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.notifications
      ADD COLUMN IF NOT EXISTS category character varying(40) NOT NULL DEFAULT 'general'
    `);
    await queryRunner.query(`
      ALTER TABLE public.notifications
      ADD COLUMN IF NOT EXISTS student_id bigint
    `);
    await queryRunner.query(`
      ALTER TABLE public.notifications
      ADD CONSTRAINT fk_notifications_student
      FOREIGN KEY (student_id) REFERENCES public.students (student_id)
      ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_student_category
      ON public.notifications (student_id, category)
      WHERE is_active = true AND student_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uniq_active_student_category`);
    await queryRunner.query(
      `ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS fk_notifications_student`,
    );
    await queryRunner.query(
      `ALTER TABLE public.notifications DROP COLUMN IF EXISTS student_id`,
    );
    await queryRunner.query(
      `ALTER TABLE public.notifications DROP COLUMN IF EXISTS category`,
    );
  }
}
