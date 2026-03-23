import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCalendarEvents1773800000000 implements MigrationInterface {
  name = 'AddCalendarEvents1773800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.calendar_events (
        calendar_event_id bigserial NOT NULL,
        school_year_id bigint NOT NULL,
        category character varying(40) NOT NULL,
        kind character varying(40) NOT NULL,
        title character varying(160) NOT NULL,
        description text,
        start_date date NOT NULL,
        end_date date NOT NULL,
        visibility_scope character varying(40) NOT NULL,
        target_teacher_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
        target_area_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
        target_class_group_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
        created_by character varying(50),
        created_by_role character varying(30),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamp with time zone NOT NULL DEFAULT now(),
        updated_at timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT calendar_events_pkey PRIMARY KEY (calendar_event_id),
        CONSTRAINT fk_calendar_events_school_year FOREIGN KEY (school_year_id)
          REFERENCES public.school_years (school_year_id)
          ON DELETE CASCADE,
        CONSTRAINT fk_calendar_events_created_by FOREIGN KEY (created_by)
          REFERENCES public.users (national_id)
          ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calendar_events_school_year_dates
      ON public.calendar_events (school_year_id, start_date, end_date)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS public.idx_calendar_events_school_year_dates`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS public.calendar_events`);
  }
}
