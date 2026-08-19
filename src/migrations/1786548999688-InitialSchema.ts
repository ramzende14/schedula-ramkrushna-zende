import { MigrationInterface, QueryRunner } from "typeorm";

export class Appointment1786548999688 implements MigrationInterface {
    name = 'Appointment1786548999688'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('DOCTOR', 'PATIENT')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'PATIENT', CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "doctor_profiles" ("id" SERIAL NOT NULL, "fullName" character varying NOT NULL, "specialization" character varying NOT NULL, "experience" integer NOT NULL, "qualification" character varying NOT NULL, "consultationFee" numeric NOT NULL, "availability" character varying NOT NULL, "profileDetails" character varying, "userId" integer, CONSTRAINT "REL_a798afca9436b00dac80f911a8" UNIQUE ("userId"), CONSTRAINT "PK_b07c128005f6a0d0135d6e7353b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "patient_profiles" ("id" SERIAL NOT NULL, "fullName" character varying NOT NULL, "age" integer NOT NULL, "gender" character varying NOT NULL, "contactDetails" character varying NOT NULL, "healthInformation" character varying, "userId" integer, CONSTRAINT "REL_fc4788002ae2de0a68f6ccf24e" UNIQUE ("userId"), CONSTRAINT "PK_7297a6976f065cc75e798674aa8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."recurring_availability_dayofweek_enum" AS ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')`);
        await queryRunner.query(`CREATE TYPE "public"."recurring_availability_schedulingtype_enum" AS ENUM('STREAM', 'WAVE')`);
        await queryRunner.query(`CREATE TABLE "recurring_availability" ("id" SERIAL NOT NULL, "dayOfWeek" "public"."recurring_availability_dayofweek_enum" NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "schedulingType" "public"."recurring_availability_schedulingtype_enum" NOT NULL, "slotDuration" integer NOT NULL, "bufferTime" integer NOT NULL DEFAULT '0', "maxPatients" integer NOT NULL DEFAULT '1', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "currentPatients" integer NOT NULL DEFAULT '0', "doctor_id" integer, CONSTRAINT "PK_2464dd095ba418858c1aa3f4e01" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."custom_availability_schedulingtype_enum" AS ENUM('STREAM', 'WAVE')`);
        await queryRunner.query(`CREATE TYPE "public"."custom_availability_type_enum" AS ENUM('ADD', 'REPLACE')`);
        await queryRunner.query(`CREATE TABLE "custom_availability" ("id" SERIAL NOT NULL, "date" date NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "schedulingType" "public"."custom_availability_schedulingtype_enum" NOT NULL, "slotDuration" integer NOT NULL, "bufferTime" integer NOT NULL DEFAULT '0', "maxPatients" integer NOT NULL DEFAULT '1', "type" "public"."custom_availability_type_enum" NOT NULL DEFAULT 'ADD', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "doctor_id" integer, "recurring_availability_id" integer, CONSTRAINT "PK_e9b8fa5803ca3d6554a7ddf7045" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."appointments_status_enum" AS ENUM('BOOKED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "appointments" ("id" SERIAL NOT NULL, "date" date NOT NULL, "startTime" TIME NOT NULL, "endTime" TIME NOT NULL, "availability_id" integer NOT NULL, "status" "public"."appointments_status_enum" NOT NULL DEFAULT 'BOOKED', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "doctor_id" integer, "patient_id" integer, CONSTRAINT "PK_4a437a9a27e948726b8bb3e36ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."notifications_type_enum" AS ENUM('APPOINTMENT_BOOKED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_RESCHEDULED')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" SERIAL NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "title" character varying NOT NULL, "message" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "eventKey" character varying NOT NULL, "patient_id" integer, "appointment_id" integer, CONSTRAINT "UQ_b0a45493af7d9873175eee482bc" UNIQUE ("eventKey"), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "doctor_profiles" ADD CONSTRAINT "FK_a798afca9436b00dac80f911a83" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patient_profiles" ADD CONSTRAINT "FK_fc4788002ae2de0a68f6ccf24e5" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" ADD CONSTRAINT "FK_814ae095c0f609eb6774680a069" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "custom_availability" ADD CONSTRAINT "FK_01e3c636792e6aee17e99ebc531" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "custom_availability" ADD CONSTRAINT "FK_9f4b25d69fefe04b08265f99ac2" FOREIGN KEY ("recurring_availability_id") REFERENCES "recurring_availability"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_4cf26c3f972d014df5c68d503d2" FOREIGN KEY ("doctor_id") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_3330f054416745deaa2cc130700" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_76ec29d7094708367ebce4e596b" FOREIGN KEY ("patient_id") REFERENCES "patient_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_9e2d01428faefb60e63c287c04a" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_9e2d01428faefb60e63c287c04a"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_76ec29d7094708367ebce4e596b"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_3330f054416745deaa2cc130700"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_4cf26c3f972d014df5c68d503d2"`);
        await queryRunner.query(`ALTER TABLE "custom_availability" DROP CONSTRAINT "FK_9f4b25d69fefe04b08265f99ac2"`);
        await queryRunner.query(`ALTER TABLE "custom_availability" DROP CONSTRAINT "FK_01e3c636792e6aee17e99ebc531"`);
        await queryRunner.query(`ALTER TABLE "recurring_availability" DROP CONSTRAINT "FK_814ae095c0f609eb6774680a069"`);
        await queryRunner.query(`ALTER TABLE "patient_profiles" DROP CONSTRAINT "FK_fc4788002ae2de0a68f6ccf24e5"`);
        await queryRunner.query(`ALTER TABLE "doctor_profiles" DROP CONSTRAINT "FK_a798afca9436b00dac80f911a83"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
        await queryRunner.query(`DROP TABLE "appointments"`);
        await queryRunner.query(`DROP TYPE "public"."appointments_status_enum"`);
        await queryRunner.query(`DROP TABLE "custom_availability"`);
        await queryRunner.query(`DROP TYPE "public"."custom_availability_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."custom_availability_schedulingtype_enum"`);
        await queryRunner.query(`DROP TABLE "recurring_availability"`);
        await queryRunner.query(`DROP TYPE "public"."recurring_availability_schedulingtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."recurring_availability_dayofweek_enum"`);
        await queryRunner.query(`DROP TABLE "patient_profiles"`);
        await queryRunner.query(`DROP TABLE "doctor_profiles"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    }

}
