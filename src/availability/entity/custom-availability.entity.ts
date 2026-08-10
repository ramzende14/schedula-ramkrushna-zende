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
import { SchedulingType } from './recurring-availability.entity';

@Entity('custom_availability')
export class CustomAvailability {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => DoctorProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor!: DoctorProfile;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'time' })
  startTime!: string;

  @Column({ type: 'time' })
  endTime!: string;

  @Column({
    type: 'enum',
    enum: SchedulingType,
    nullable: true,
    default: null,
  })
  schedulingType?: SchedulingType | null;

  @Column({ type: 'int', nullable: true })
  slotDuration?: number | null;

  @Column({ type: 'int', nullable: true, default: 0 })
  bufferTime?: number | null;

  @Column({ type: 'int', nullable: true })
  maxPatients?: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}