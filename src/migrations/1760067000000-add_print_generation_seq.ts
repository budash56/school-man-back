import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrintGenerationSeq1760067000000 implements MigrationInterface {
  name = 'AddPrintGenerationSeq1760067000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS print_generation_seq
      INCREMENT BY 1
      MINVALUE 1
      START WITH 1
      OWNED BY NONE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP SEQUENCE IF EXISTS print_generation_seq;`);
  }
}
