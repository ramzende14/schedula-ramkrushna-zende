import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  Matches,
  Min,
} from 'class-validator';

export class ShrinkAvailabilityDto {
  @IsInt()
  @Min(1)
  availabilityId!: number;

  @IsDateString()
  date!: string;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  newEndTime!: string;
}