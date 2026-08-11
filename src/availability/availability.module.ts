import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

import { RecurringAvailability } from './entity/recurring-availability.entity';
import { CustomAvailability } from './entity/custom-availability.entity';
import { DoctorProfile } from '../doctor/entity/doctor-profile.entity';
import { Appointment } from '../appointment/entity/appointment.entity';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecurringAvailability,
      CustomAvailability,
      DoctorProfile,
      Appointment,
    ]),

    NotificationModule,
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
})
export class AvailabilityModule {}