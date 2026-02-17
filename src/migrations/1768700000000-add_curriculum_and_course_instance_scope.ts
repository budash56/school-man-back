import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCurriculumAndCourseInstanceScope1768700000000
  implements MigrationInterface
{
  name = 'AddCurriculumAndCourseInstanceScope1768700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'course_instance_scope'
        ) THEN
          CREATE TYPE "public"."course_instance_scope" AS ENUM (
            'GRADE',
            'CLASS_GROUP'
          );
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.curricula (
        curriculum_id bigserial NOT NULL,
        grade_level smallint NOT NULL,
        name character varying(120) NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp with time zone DEFAULT now(),
        CONSTRAINT curricula_pkey PRIMARY KEY (curriculum_id),
        CONSTRAINT curricula_grade_level_key UNIQUE (grade_level)
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.curriculum_items (
        curriculum_item_id bigserial NOT NULL,
        curriculum_id bigint NOT NULL,
        subject_id bigint NOT NULL,
        weekly_hours integer NOT NULL DEFAULT 0,
        double_session_required boolean NOT NULL DEFAULT false,
        notes text,
        created_at timestamp with time zone DEFAULT now(),
        CONSTRAINT curriculum_items_pkey PRIMARY KEY (curriculum_item_id),
        CONSTRAINT curriculum_items_curriculum_subject_key UNIQUE (curriculum_id, subject_id),
        CONSTRAINT curriculum_items_curriculum_id_fkey FOREIGN KEY (curriculum_id)
          REFERENCES public.curricula (curriculum_id) MATCH SIMPLE
          ON UPDATE NO ACTION
          ON DELETE CASCADE,
        CONSTRAINT curriculum_items_subject_id_fkey FOREIGN KEY (subject_id)
          REFERENCES public.subjects (subject_id) MATCH SIMPLE
          ON UPDATE NO ACTION
          ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.class_group_curriculum_overrides (
        override_id bigserial NOT NULL,
        class_group_id bigint NOT NULL,
        curriculum_item_id bigint NOT NULL,
        weekly_hours_override integer,
        double_session_override boolean,
        is_disabled boolean NOT NULL DEFAULT false,
        created_at timestamp with time zone DEFAULT now(),
        CONSTRAINT class_group_curriculum_overrides_pkey PRIMARY KEY (override_id),
        CONSTRAINT class_group_curriculum_overrides_group_item_key
          UNIQUE (class_group_id, curriculum_item_id),
        CONSTRAINT class_group_curriculum_overrides_class_group_id_fkey
          FOREIGN KEY (class_group_id)
          REFERENCES public.class_groups (class_group_id) MATCH SIMPLE
          ON UPDATE NO ACTION
          ON DELETE CASCADE,
        CONSTRAINT class_group_curriculum_overrides_curriculum_item_id_fkey
          FOREIGN KEY (curriculum_item_id)
          REFERENCES public.curriculum_items (curriculum_item_id) MATCH SIMPLE
          ON UPDATE NO ACTION
          ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      ALTER TABLE public.course_instances
        ADD COLUMN IF NOT EXISTS scope_type public.course_instance_scope NOT NULL DEFAULT 'GRADE',
        ADD COLUMN IF NOT EXISTS class_group_id bigint,
        ADD COLUMN IF NOT EXISTS curriculum_item_id bigint,
        ADD COLUMN IF NOT EXISTS double_session_required boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      ALTER TABLE public.course_instances
        ADD CONSTRAINT course_instances_class_group_id_fkey
        FOREIGN KEY (class_group_id)
        REFERENCES public.class_groups (class_group_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE public.course_instances
        ADD CONSTRAINT course_instances_curriculum_item_id_fkey
        FOREIGN KEY (curriculum_item_id)
        REFERENCES public.curriculum_items (curriculum_item_id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE public.course_instances
        ADD CONSTRAINT course_instances_scope_class_group_ck
        CHECK (
          (scope_type = 'GRADE' AND class_group_id IS NULL)
          OR (scope_type = 'CLASS_GROUP' AND class_group_id IS NOT NULL)
        );
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
    await queryRunner.query(
      `DROP INDEX IF EXISTS ux_course_instances_class_group_scope;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS ux_course_instances_grade_scope;`,
    );

    await queryRunner.query(
      `ALTER TABLE public.course_instances
        DROP CONSTRAINT IF EXISTS course_instances_scope_class_group_ck;`,
    );

    await queryRunner.query(
      `ALTER TABLE public.course_instances
        DROP CONSTRAINT IF EXISTS course_instances_curriculum_item_id_fkey;`,
    );
    await queryRunner.query(
      `ALTER TABLE public.course_instances
        DROP CONSTRAINT IF EXISTS course_instances_class_group_id_fkey;`,
    );

    await queryRunner.query(`
      ALTER TABLE public.course_instances
        DROP COLUMN IF EXISTS double_session_required,
        DROP COLUMN IF EXISTS curriculum_item_id,
        DROP COLUMN IF EXISTS class_group_id,
        DROP COLUMN IF EXISTS scope_type;
    `);

    await queryRunner.query(`
      ALTER TABLE public.course_instances
        ADD CONSTRAINT course_instances_subject_id_grade_level_school_year_id_key
        UNIQUE (subject_id, grade_level, school_year_id);
    `);

    await queryRunner.query(
      `DROP TABLE IF EXISTS public.class_group_curriculum_overrides;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS public.curriculum_items;`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.curricula;`);

    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."course_instance_scope";`,
    );
  }
}
