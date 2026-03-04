import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBuildingsAndLinkClassrooms1771979000000 implements MigrationInterface {
    name = 'AddBuildingsAndLinkClassrooms1771979000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS public.buildings (
                building_id bigserial NOT NULL,
                name character varying(80) NOT NULL,
                is_lab boolean NOT NULL DEFAULT false,
                is_auditorium boolean NOT NULL DEFAULT false,
                is_computer_room boolean NOT NULL DEFAULT false,
                created_at timestamp with time zone DEFAULT now(),
                CONSTRAINT buildings_pkey PRIMARY KEY (building_id),
                CONSTRAINT buildings_name_key UNIQUE (name)
            );
        `);

        await queryRunner.query(`
            ALTER TABLE public.classrooms
                ADD COLUMN IF NOT EXISTS building_id bigint;
        `);

        await queryRunner.query(`
            INSERT INTO public.buildings(name)
            SELECT DISTINCT building
            FROM public.classrooms
            WHERE building IS NOT NULL AND building <> ''
            ON CONFLICT (name) DO NOTHING;
        `);

        await queryRunner.query(`
            UPDATE public.classrooms c
            SET building_id = b.building_id
            FROM public.buildings b
            WHERE c.building IS NOT NULL
              AND c.building <> ''
              AND b.name = c.building;
        `);

        await queryRunner.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM pg_constraint
                    WHERE conname = 'classrooms_building_id_fkey'
                ) THEN
                    ALTER TABLE public.classrooms
                        ADD CONSTRAINT classrooms_building_id_fkey
                        FOREIGN KEY (building_id)
                        REFERENCES public.buildings(building_id)
                        ON DELETE RESTRICT;
                END IF;
            END $$;
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_classrooms_building_id
            ON public.classrooms(building_id);
        `);

        await queryRunner.query(`
            ALTER TABLE public.classrooms
                DROP COLUMN IF EXISTS building;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE public.classrooms
                ADD COLUMN IF NOT EXISTS building character varying(80);
        `);

        await queryRunner.query(`
            UPDATE public.classrooms c
            SET building = b.name
            FROM public.buildings b
            WHERE c.building_id = b.building_id;
        `);

        await queryRunner.query(`
            ALTER TABLE public.classrooms
                DROP CONSTRAINT IF EXISTS classrooms_building_id_fkey;
        `);

        await queryRunner.query(`
            DROP INDEX IF EXISTS idx_classrooms_building_id;
        `);

        await queryRunner.query(`
            ALTER TABLE public.classrooms
                DROP COLUMN IF EXISTS building_id;
        `);

        await queryRunner.query(`
            DROP TABLE IF EXISTS public.buildings;
        `);
    }
}
