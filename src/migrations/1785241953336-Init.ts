import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1785241953336 implements MigrationInterface {
    name = 'Init1785241953336'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recurring_availability" DROP COLUMN "maxPatients"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recurring_availability" ADD "maxPatients" integer`);
    }

}
