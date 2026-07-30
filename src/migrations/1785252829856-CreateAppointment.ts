import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAppointment1785252829856 implements MigrationInterface {
    name = 'CreateAppointment1785252829856'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recurring_availability" RENAME COLUMN "updatedAt" TO "maxPatients"`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" DROP COLUMN "maxPatients"`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" ADD "maxPatients" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recurring_availability" DROP COLUMN "maxPatients"`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" ADD "maxPatients" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" RENAME COLUMN "maxPatients" TO "updatedAt"`);
    }

}
