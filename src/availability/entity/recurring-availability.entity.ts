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
import { DayOfWeek } from '../enum/day-of-week.enum';

export enum SchedulingType {
  STREAM = 'STREAM',
  WAVE = 'WAVE',
}

@Entity('recurring_availability')
export class RecurringAvailability {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => DoctorProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: DoctorProfile;

  @Column({
    type: 'enum',
    enum: DayOfWeek,
  })
  dayOfWeek!: DayOfWeek;

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({
  type: 'int',
  default: 0,
})
currentPatients!: number;
}