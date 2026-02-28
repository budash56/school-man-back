import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateCurriculumItemsSubjectCascade1771978000000 implements MigrationInterface {
    name = 'UpdateCurriculumItemsSubjectCascade1771978000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE public.curriculum_items
                DROP CONSTRAINT IF EXISTS curriculum_items_subject_id_fkey;
        `);

        await queryRunner.query(`
            ALTER TABLE public.curriculum_items
                ADD CONSTRAINT curriculum_items_subject_id_fkey
                FOREIGN KEY (subject_id)
                REFERENCES public.subjects(subject_id)
                ON DELETE CASCADE;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE public.curriculum_items
                DROP CONSTRAINT IF EXISTS curriculum_items_subject_id_fkey;
        `);

        await queryRunner.query(`
            ALTER TABLE public.curriculum_items
                ADD CONSTRAINT curriculum_items_subject_id_fkey
                FOREIGN KEY (subject_id)
                REFERENCES public.subjects(subject_id)
                ON DELETE RESTRICT;
        `);
    }
}
