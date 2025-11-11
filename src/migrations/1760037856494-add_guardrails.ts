import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGuardrails1760037856494 implements MigrationInterface {
  name = 'AddGuardrails1760037856494';

  public async up(q: QueryRunner): Promise<void> {
    // A) timetable_slots: composite unique + time check
    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_timetable_slot
      ON public.timetable_slots (day_of_week, start_time, end_time);
    `);
    await q.query(`
      ALTER TABLE public.timetable_slots
      ADD CONSTRAINT chk_slot_time CHECK (start_time < end_time)
      NOT VALID;
    `);
    await q.query(
      `ALTER TABLE public.timetable_slots VALIDATE CONSTRAINT chk_slot_time;`,
    );

    // B) course_instances: two uniques
    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_ci_subject_grade_year
      ON public.course_instances (subject_id, grade_level, school_year_id);
    `);
    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_ci_coursecode_year
      ON public.course_instances (course_code, school_year_id);
    `);

    // C) class_groups: unique + section format (two digits)
    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_cg_year_grade_section
      ON public.class_groups (school_year_id, grade_level, section);
    `);
    await q.query(`
      ALTER TABLE public.class_groups
      ADD CONSTRAINT chk_cg_section_format CHECK (section ~ '^[0-9]{2}$')
      NOT VALID;
    `);
    await q.query(
      `ALTER TABLE public.class_groups VALIDATE CONSTRAINT chk_cg_section_format;`,
    );

    // D) courses: unique (course_instance, class_group, teacher)
    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_course_ci_cg_teacher
      ON public.courses (course_instance_id, class_group_id, teacher_id);
    `);

    // E) grades: unique (student, course, term)
    await q.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_grade_student_course_term
      ON public.grades (student_id, course_id, term_id);
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX IF EXISTS uniq_grade_student_course_term;`);
    await q.query(`DROP INDEX IF EXISTS uniq_course_ci_cg_teacher;`);
    await q.query(
      `ALTER TABLE public.class_groups DROP CONSTRAINT IF EXISTS chk_cg_section_format;`,
    );
    await q.query(`DROP INDEX IF EXISTS uniq_cg_year_grade_section;`);
    await q.query(`DROP INDEX IF EXISTS uniq_ci_coursecode_year;`);
    await q.query(`DROP INDEX IF EXISTS uniq_ci_subject_grade_year;`);
    await q.query(
      `ALTER TABLE public.timetable_slots DROP CONSTRAINT IF EXISTS chk_slot_time;`,
    );
    await q.query(`DROP INDEX IF EXISTS uniq_timetable_slot;`);
  }
}
