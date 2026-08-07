import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';

import { AppointmentService } from './appointment.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorator/roles.decorator';
import { UserRole } from '../user/user.entity';

import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AppointmentController {

  constructor(
    private readonly appointmentService: AppointmentService,
  ) { }

  @Roles(UserRole.PATIENT)
  @Post('appointment')
  create(
    @Req() req,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentService.createAppointment(
      req.user.userId,
      dto,
    );
  }

  @Roles(UserRole.PATIENT)
  @Get('appointment/my')
  myAppointments(@Req() req) {
    return this.appointmentService.getMyAppointments(
      req.user.userId,
    );
  }

  @Roles(UserRole.PATIENT)
  @Patch('appointment/:id/cancel')
  cancel(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.appointmentService.cancelAppointment(
      req.user.userId,
      id,
    );
  }

  @Roles(UserRole.DOCTOR)
  @Get('doctor/appointments')
  doctorAppointments(@Req() req) {
    return this.appointmentService.getDoctorAppointments(
      req.user.userId,
    );
  }


  @Roles(UserRole.PATIENT)
  @Get('appointment/doctor/:doctorId/slots')
  getAvailableSlots(
    @Param('doctorId', ParseIntPipe) doctorId: number,
    @Query('date') date: string,
  ) {
    return this.appointmentService.getAvailableSlots(
      doctorId,
      date,
    );
  }
  @Roles(UserRole.PATIENT)
  @Patch('appointment/:id/reschedule')
  reschedule(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointmentService.rescheduleAppointment(
      req.user.userId,
      id,
      dto,
    );
  }
}