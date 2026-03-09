import { MigrationInterface, QueryRunner } from "typeorm";

export class AddClassGroupFixedLocations1771990000000 implements MigrationInterface {
    name = 'AddClassGroupFixedLocations1771990000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS public.class_group_fixed_locations (
                fixed_location_id bigserial NOT NULL,
                grade_level smallint NOT NULL,
                section character varying(10) NOT NULL,
                classroom_id bigint NOT NULL,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT class_group_fixed_locations_pkey PRIMARY KEY (fixed_location_id),
                CONSTRAINT class_group_fixed_locations_grade_section_key UNIQUE (grade_level, section)
            );
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_class_group_fixed_locations_classroom_id
            ON public.class_group_fixed_locations(classroom_id);
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'class_group_fixed_locations_classroom_id_fkey'
                ) THEN
                    ALTER TABLE public.class_group_fixed_locations
                        ADD CONSTRAINT class_group_fixed_locations_classroom_id_fkey
                        FOREIGN KEY (classroom_id)
                        REFERENCES public.classrooms(classroom_id)
                        ON DELETE RESTRICT;
                END IF;
            END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS public.class_group_fixed_locations;
        `);
    }
}
