import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { DoctorProfile } from '../../doctor/entity/doctor-profile.entity';
import { PatientProfile } from '../../patient/entity/patient-profile.entity';

export enum AppointmentStatus {
  BOOKED = 'BOOKED',
  CANCELLED = 'CANCELLED',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => DoctorProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: DoctorProfile;

  @ManyToOne(() => PatientProfile, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'patient_id' })
  patient!: PatientProfile;

  @Column({
    type: 'date',
  })
  date!: string;

  @Column({
    type: 'time',
  })
  startTime!: string;

  @Column({
    type: 'time',
  })
  endTime!: string;

  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.BOOKED,
  })
  status!: AppointmentStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}