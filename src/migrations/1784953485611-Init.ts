import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1784953485611 implements MigrationInterface {
    name = 'Init1784953485611'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."recurring_availability_schedulingtype_enum" AS ENUM('STREAM', 'WAVE')`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" ADD "schedulingType" "public"."recurring_availability_schedulingtype_enum" NOT NULL DEFAULT 'STREAM'`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" ADD "slotDuration" integer`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" ADD "bufferTime" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" ADD "maxPatients" integer`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" ADD "currentPatients" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recurring_availability" DROP COLUMN "currentPatients"`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" DROP COLUMN "maxPatients"`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" DROP COLUMN "bufferTime"`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" DROP COLUMN "slotDuration"`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" DROP COLUMN "schedulingType"`);
        await queryRunner.query(`DROP TYPE "public"."recurring_availability_schedulingtype_enum"`);
    }

}
