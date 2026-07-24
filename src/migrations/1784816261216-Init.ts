import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1784816261216 implements MigrationInterface {
    name = 'Init1784816261216'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "recurring_availability" ("id" SERIAL NOT NULL, "dayOfWeek" character varying NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "doctor_id" integer, CONSTRAINT "PK_2464dd095ba418858c1aa3f4e01" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "custom_availability" ("id" SERIAL NOT NULL, "date" date NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "doctor_id" integer, CONSTRAINT "PK_e9b8fa5803ca3d6554a7ddf7045" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" ADD CONSTRAINT "FK_814ae095c0f609eb6774680a069" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "custom_availability" ADD CONSTRAINT "FK_01e3c636792e6aee17e99ebc531" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "custom_availability" DROP CONSTRAINT "FK_01e3c636792e6aee17e99ebc531"`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" DROP CONSTRAINT "FK_814ae095c0f609eb6774680a069"`);
        await queryRunner.query(`DROP TABLE "custom_availability"`);
        await queryRunner.query(`DROP TABLE "recurring_availability"`);
    }

}
