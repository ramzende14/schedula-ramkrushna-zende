import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { PatientService } from './patient.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorator/roles.decorator';
import { Role } from '../common/enum/role.enum';

import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';

@Controller('patient')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class PatientController {
  constructor(
    private readonly patientService: PatientService,
  ) {}

  @Post('profile')
  createProfile(
    @Request() req,
    @Body() dto: CreatePatientProfileDto,
  ) {
    return this.patientService.createProfile(
      req.user.id,
      dto,
    );
  }

  @Get('profile')
  getProfile(@Request() req) {
    return this.patientService.getProfile(
      req.user.id,
    );
  }

  @Patch('profile')
  updateProfile(
    @Request() req,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.patientService.updateProfile(
      req.user.id,
      dto,
    );
  }

  @Get('dashboard')
  getDashboard() {
    return {
      message: 'Patient Dashboard',
    };
  }
}