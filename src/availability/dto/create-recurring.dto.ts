import {
  IsEnum,
  IsNotEmpty,
  Matches,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

import { SchedulingType } from '../entity/recurring-availability.entity';

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export class CreateRecurringDto {
  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime!: string;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime!: string;

  @IsEnum(SchedulingType)
  schedulingType!: SchedulingType;

  @IsOptional()
  @IsInt()
  @Min(5)
  slotDuration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferTime?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPatients?: number;
}