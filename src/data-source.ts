import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

import { User } from './user/user.entity';
import { DoctorProfile } from './doctor/entity/doctor-profile.entity';
import { PatientProfile } from './patient/entity/patient-profile.entity';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  entities: [User, DoctorProfile, PatientProfile],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});