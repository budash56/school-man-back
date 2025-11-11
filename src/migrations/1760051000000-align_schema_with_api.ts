import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignSchemaWithApi1760051000000 implements MigrationInterface {
  name = 'AlignSchemaWithApi1760051000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "public"."grades" ALTER COLUMN "scheme_value_id" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."grades_mark_enum" AS ENUM('S', 'A', 'B', 'J')`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."grades" ADD "mark" "public"."grades_mark_enum" NOT NULL DEFAULT 'A'`,
    );
    await queryRunner.query(`ALTER TABLE "public"."grades" ADD "comment" text`);

    await queryRunner.query(
      `ALTER TABLE "public"."notifications" ADD "title" character varying(120)`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."notifications" ADD "message" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."notifications" ADD "is_active" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `UPDATE "public"."notifications" SET "title" = COALESCE("type", 'Untitled')`,
    );
    await queryRunner.query(
      `UPDATE "public"."notifications" SET "message" = CASE WHEN "payload" IS NULL THEN NULL ELSE "payload"::text END`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."notifications" ALTER COLUMN "title" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."notifications" DROP COLUMN "type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."notifications" DROP COLUMN "payload"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."notifications" DROP COLUMN "target_role"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."notifications" DROP COLUMN "read_at"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "public"."notifications" ADD "read_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."notifications" ADD "target_role" "user_role" NOT NULL DEFAULT 'teacher'`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."notifications" ADD "payload" jsonb NOT NULL DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."notifications" ADD "type" character varying(40) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `UPDATE "public"."notifications" SET "type" = left("title", 40), "payload" = COALESCE(jsonb_build_object('message', "message"), '{}'::jsonb)`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."notifications" DROP COLUMN "is_active"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."notifications" DROP COLUMN "message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "public"."notifications" DROP COLUMN "title"`,
    );

    await queryRunner.query(
      `ALTER TABLE "public"."grades" DROP COLUMN "comment"`,
    );
    await queryRunner.query(`ALTER TABLE "public"."grades" DROP COLUMN "mark"`);
    await queryRunner.query(`DROP TYPE "public"."grades_mark_enum"`);
    await queryRunner.query(
      `ALTER TABLE "public"."grades" ALTER COLUMN "scheme_value_id" SET NOT NULL`,
    );
  }
}
