import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserPasswordFlags1772200000000 implements MigrationInterface {
  name = 'AddUserPasswordFlags1772200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS temp_password_issued_at timestamp with time zone
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.users
      DROP COLUMN IF EXISTS temp_password_issued_at
    `);
    await queryRunner.query(`
      ALTER TABLE public.users
      DROP COLUMN IF EXISTS must_change_password
    `);
  }
}
