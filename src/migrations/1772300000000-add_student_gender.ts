import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentGender1772300000000 implements MigrationInterface {
  name = 'AddStudentGender1772300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.students
      ADD COLUMN IF NOT EXISTS gender character varying(20)
    `);

    await queryRunner.query(`
      UPDATE public.students
      SET gender = 'No Binario'
      WHERE gender IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE public.students
      ALTER COLUMN gender SET DEFAULT 'No Binario'
    `);

    await queryRunner.query(`
      ALTER TABLE public.students
      ALTER COLUMN gender SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE public.students
      ADD CONSTRAINT chk_students_gender
      CHECK (gender IN ('Femenino', 'Masculino', 'No Binario'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.students
      DROP CONSTRAINT IF EXISTS chk_students_gender
    `);

    await queryRunner.query(`
      ALTER TABLE public.students
      DROP COLUMN IF EXISTS gender
    `);
  }
}
