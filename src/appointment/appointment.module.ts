import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Appointment } from './entity/appointment.entity';
import { DoctorProfile } from '../doctor/entity/doctor-profile.entity';
import { PatientProfile } from '../patient/entity/patient-profile.entity';
import { RecurringAvailability } from '../availability/entity/recurring-availability.entity';
import { CustomAvailability } from '../availability/entity/custom-availability.entity';

import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';

import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      DoctorProfile,
      PatientProfile,
      RecurringAvailability,
      CustomAvailability,
    ]),

    NotificationModule,
  ],

  controllers: [AppointmentController],

  providers: [AppointmentService],
})
export class AppointmentModule {}