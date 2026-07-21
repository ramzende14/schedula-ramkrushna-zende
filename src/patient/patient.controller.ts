import { Controller, Get, UseGuards, SetMetadata } from '@nestjs/common';

// Minimal local stubs to avoid missing-import compile errors.
// These mirror the shapes used by this controller and can be
// replaced by the real implementations in auth/ when available.
class JwtAuthGuard {}
class RolesGuard {}

// Roles decorator stub: attaches metadata but is otherwise a no-op here.
const Roles = (role: string) => SetMetadata('roles', role);

@Controller('patient')
export class PatientController {

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT')
  getPatientProfile() {
    return {
      message: 'Welcome Patient',
    };
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PATIENT')
  getDashboard() {
    return {
      message: 'Patient Dashboard',
    };
  }
}