import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeacherSubjects1768705000000 implements MigrationInterface {
  name = 'AddTeacherSubjects1768705000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.teacher_subjects (
        teacher_subject_id bigserial NOT NULL,
        teacher_id character varying(50) NOT NULL,
        subject_id bigint NOT NULL,
        created_at timestamp with time zone DEFAULT now(),
        CONSTRAINT teacher_subjects_pkey PRIMARY KEY (teacher_subject_id),
        CONSTRAINT teacher_subjects_teacher_subject_key UNIQUE (teacher_id, subject_id),
        CONSTRAINT teacher_subjects_teacher_id_fkey FOREIGN KEY (teacher_id)
          REFERENCES public.users (national_id) MATCH SIMPLE
          ON UPDATE NO ACTION
          ON DELETE CASCADE,
        CONSTRAINT teacher_subjects_subject_id_fkey FOREIGN KEY (subject_id)
          REFERENCES public.subjects (subject_id) MATCH SIMPLE
          ON UPDATE NO ACTION
          ON DELETE RESTRICT
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.teacher_subjects;`);
  }
}
