import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorator/roles.decorator';
import { Role } from '../common/enum/role.enum';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';

@Controller('doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post('profile')
createProfile(
  @Request() req,
  @Body() dto: CreateDoctorProfileDto,
) {
  console.log(req.user);

  return this.doctorService.createProfile(req.user.id, dto);
}

  @Get('profile')
  getProfile(@Request() req) {
    return this.doctorService.getProfile(req.user.id);
  }

  @Patch('profile')
  updateProfile(
    @Request() req,
    @Body() dto: UpdateDoctorProfileDto,
  ) {
    return this.doctorService.updateProfile(req.user.id, dto);
  }
}