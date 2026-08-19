import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Matches,
  Min,
} from 'class-validator';

import { SchedulingType } from '../entity/recurring-availability.entity';

export class CreateOverrideDto {
  @IsDateString()
  date!: string;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime!: string;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime!: string;

  @IsEnum(SchedulingType)
  schedulingType!: SchedulingType;

  @IsInt()
  @Min(5)
  slotDuration!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  bufferTime?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPatients?: number;
}