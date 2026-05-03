import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCourseInstanceScopedUniqueness1775300000000
  implements MigrationInterface
{
  name = 'FixCourseInstanceScopedUniqueness1775300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS public.uniq_ci_subject_grade_year;
    `);

    await queryRunner.query(`
      ALTER TABLE public.course_instances
        DROP CONSTRAINT IF EXISTS course_instances_subject_id_grade_level_school_year_id_key;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_course_instances_grade_scope
        ON public.course_instances (subject_id, grade_level, school_year_id)
        WHERE scope_type = 'GRADE';
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_course_instances_class_group_scope
        ON public.course_instances (subject_id, class_group_id, school_year_id)
        WHERE scope_type = 'CLASS_GROUP';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ux_course_instances_class_group_scope;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS public.ux_course_instances_grade_scope;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_ci_subject_grade_year
        ON public.course_instances (subject_id, grade_level, school_year_id);
    `);
  }
}
