import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
// import { Type } from 'class-transformer';

export class CreateDoctorProfileDto {
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  specialization!: string;

  @IsNumber()
  @Min(0)
  experience!: number;

  @IsString()
  @IsNotEmpty()
  qualification!: string;

  @IsNumber()
  @Min(0)
  consultationFee!: number;

  @IsString()
  @IsNotEmpty()
  availability!: string;

  @IsOptional()
  @IsString()
  profileDetails?: string;
}