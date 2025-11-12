import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertGradesMarkToNumeric1760075000000
  implements MigrationInterface
{
  name = 'ConvertGradesMarkToNumeric1760075000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "public"."grades" ADD COLUMN "mark_numeric" smallint`,
    );
    await queryRunner.query(
      `UPDATE "public"."grades"
       SET "mark_numeric" = CASE "mark"
         WHEN 'S' THEN 5
         WHEN 'A' THEN 4
         WHEN 'B' THEN 3
         WHEN 'J' THEN 1
         ELSE 1
       END`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."grades" ALTER COLUMN "mark_numeric" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."grades" DROP COLUMN "mark"`,
    );
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."grades_mark_enum"`);
    await queryRunner.query(
      `ALTER TABLE "public"."grades" RENAME COLUMN "mark_numeric" TO "mark"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."grades" ALTER COLUMN "mark" SET DEFAULT 4`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "public"."grades"."mark" IS 'Numeric mark domain: 5=S, 4=A, 3=B, 1=J. Values 2 and 0 are unused.'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."grades_mark_enum" AS ENUM('S', 'A', 'B', 'J')`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."grades" ADD COLUMN "mark_enum" "public"."grades_mark_enum"`,
    );
    await queryRunner.query(
      `UPDATE "public"."grades"
       SET "mark_enum" = CASE "mark"
         WHEN 5 THEN 'S'
         WHEN 4 THEN 'A'
         WHEN 3 THEN 'B'
         ELSE 'J'
       END`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."grades" ALTER COLUMN "mark_enum" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."grades" DROP COLUMN "mark"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."grades" RENAME COLUMN "mark_enum" TO "mark"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."grades" ALTER COLUMN "mark" SET DEFAULT 'A'`,
    );
  }
}
