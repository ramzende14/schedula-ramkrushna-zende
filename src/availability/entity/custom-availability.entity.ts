import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';

import { DoctorProfile } from '../../doctor/entity/doctor-profile.entity';
import {
  RecurringAvailability,
  SchedulingType,
} from './recurring-availability.entity';

export enum CustomAvailabilityType {
  ADD = 'ADD',
  REPLACE = 'REPLACE',
  SHRINK = 'SHRINK',
}

@Entity('custom_availability')
export class CustomAvailability {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => DoctorProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: DoctorProfile;

  @ManyToOne(
    () => RecurringAvailability,
    {
      nullable: true,
      onDelete: 'SET NULL',
    },
  )
  @JoinColumn({ name: 'recurring_availability_id' })
  recurringAvailability?: RecurringAvailability | null;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'time' })
  startTime!: string;

  @Column({ type: 'time' })
  endTime!: string;

  @Column({
    type: 'enum',
    enum: SchedulingType,
  })
  schedulingType!: SchedulingType;

  @Column({ type: 'int' })
  slotDuration!: number;

  @Column({
    type: 'int',
    default: 0,
  })
  bufferTime!: number;

  @Column({
    type: 'int',
    default: 1,
  })
  maxPatients!: number;

  @Column({
    type: 'enum',
    enum: CustomAvailabilityType,
    default: CustomAvailabilityType.ADD,
  })
  type!: CustomAvailabilityType;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}