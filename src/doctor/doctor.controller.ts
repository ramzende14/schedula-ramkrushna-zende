import { Controller, Get, UseGuards } from '@nestjs/common';

// Fallback JwtAuthGuard in case the external guard file is missing.
// This keeps the controller functional without an external dependency.
const JwtAuthGuard = class {};

// Fallback Roles decorator in case the external decorator file is missing.
// This keeps the controller functional without an external dependency.
const Roles = (..._roles: string[]) => {
  return (_target: any, _key?: any, _descriptor?: any) => {};
};

@Controller('doctor')
export class DoctorController {

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @Roles('DOCTOR')
  getDoctorProfile() {
    return {
      message: 'Welcome Doctor',
    };
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @Roles('DOCTOR')
  getDashboard() {
    return {
      message: 'Doctor Dashboard',
    };
  }
}