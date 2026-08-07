import { IsNumber, IsString } from 'class-validator';

export class RescheduleAppointmentDto {

  @IsNumber()
  doctorId!: number;

  @IsString()
  date!: string;

  @IsString()
  startTime!: string;

  @IsString()
  endTime!: string;
}