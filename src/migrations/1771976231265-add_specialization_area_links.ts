import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSpecializationAreaLinks1771976231265 implements MigrationInterface {
    name = 'AddSpecializationAreaLinks1771976231265';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE public.subject_areas
                ADD COLUMN IF NOT EXISTS is_specialization boolean NOT NULL DEFAULT false;
        `);

        await queryRunner.query(`
            ALTER TABLE public.curricula
                ADD COLUMN IF NOT EXISTS specialization_area_id bigint;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'fk_curricula_specialization_area'
                ) THEN
                    ALTER TABLE public.curricula
                        ADD CONSTRAINT fk_curricula_specialization_area
                        FOREIGN KEY (specialization_area_id)
                        REFERENCES public.subject_areas(area_id)
                        ON DELETE RESTRICT;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE public.curricula
                DROP CONSTRAINT IF EXISTS fk_curricula_specialization_area;
        `);

        await queryRunner.query(`
            ALTER TABLE public.curricula
                DROP COLUMN IF EXISTS specialization_area_id;
        `);

        await queryRunner.query(`
            ALTER TABLE public.subject_areas
                DROP COLUMN IF EXISTS is_specialization;
        `);
    }
}
