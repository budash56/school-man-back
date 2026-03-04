import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBuildingFlags1771980000000 implements MigrationInterface {
    name = 'AddBuildingFlags1771980000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE public.buildings
                ADD COLUMN IF NOT EXISTS is_lab boolean NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS is_auditorium boolean NOT NULL DEFAULT false,
                ADD COLUMN IF NOT EXISTS is_computer_room boolean NOT NULL DEFAULT false;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE public.buildings
                DROP COLUMN IF EXISTS is_lab,
                DROP COLUMN IF EXISTS is_auditorium,
                DROP COLUMN IF EXISTS is_computer_room;
        `);
    }
}
