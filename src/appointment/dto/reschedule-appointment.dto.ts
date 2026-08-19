import {
  IsInt,
  IsDateString,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class RescheduleAppointmentDto {

  @IsInt()
  doctorId!: number;

  @IsDateString()
  date!: string;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime!: string;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime!: string;
}