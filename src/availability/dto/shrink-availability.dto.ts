import {
  IsDateString,
  IsNotEmpty,
  Matches,
} from 'class-validator';

export class ShrinkAvailabilityDto {
  @IsDateString()
  date!: string;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  newEndTime!: string;
}