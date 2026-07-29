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

  @Column()
  dayOfWeek!: string;

  @Column({ type: 'time' })
  startTime!: string;

  @Column({ type: 'time' })
  endTime!: string;

  @Column({
    type: 'enum',
    enum: SchedulingType,
    default: SchedulingType.STREAM,
  })
  schedulingType!: SchedulingType;

  @Column({ nullable: true })
  slotDuration?: number;

  @Column({ default: 0 })
  bufferTime!: number;

  @Column({ default: 0 })
  currentPatients!: number;

  @CreateDateColumn()
  createdAt!: Date;

 @Column({ nullable: true })
maxPatients?: number;
}