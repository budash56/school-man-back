import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEnrollmentGradeLevel1772000000000 implements MigrationInterface {
    name = 'AddEnrollmentGradeLevel1772000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE public.enrollments
                ADD COLUMN IF NOT EXISTS grade_level smallint;
        `);

        await queryRunner.query(`
            UPDATE public.enrollments AS enrollment
            SET grade_level = class_group.grade_level
            FROM public.class_groups AS class_group
            WHERE enrollment.class_group_id = class_group.class_group_id
              AND enrollment.grade_level IS NULL;
        `);

        await queryRunner.query(`
            ALTER TABLE public.enrollments
                ALTER COLUMN grade_level SET NOT NULL;
        `);

        await queryRunner.query(`
            ALTER TABLE public.enrollments
                ALTER COLUMN class_group_id DROP NOT NULL;
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_enrollments_grade_year
            ON public.enrollments(school_year_id, grade_level);
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_enrollments_pending
            ON public.enrollments(school_year_id, grade_level)
            WHERE class_group_id IS NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_enrollments_pending;
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_enrollments_grade_year;
        `);

        await queryRunner.query(`
            ALTER TABLE public.enrollments
                ALTER COLUMN class_group_id SET NOT NULL;
        `);

        await queryRunner.query(`
            ALTER TABLE public.enrollments
                DROP COLUMN IF EXISTS grade_level;
        `);
    }
}
