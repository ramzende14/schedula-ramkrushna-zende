import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePatientProfileDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  age!: number;

  @IsString()
  @IsNotEmpty()
  gender!: string;

  @IsString()
  @IsNotEmpty()
  contactDetails!: string;

  @IsOptional()
  @IsString()
  healthInformation?: string;
}