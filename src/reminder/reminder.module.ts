import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReminderService } from './reminder.service';

import { Appointment } from '../appointment/entity/appointment.entity';
import { Notification } from '../notification/notification.entity';

import { RecurringAvailability } from '../availability/entity/recurring-availability.entity';
import { CustomAvailability } from '../availability/entity/custom-availability.entity';

import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appointment,
      Notification,
      RecurringAvailability,
      CustomAvailability,
    ]),

    NotificationModule,
  ],

  providers: [
    ReminderService,
  ],
})
export class ReminderModule {}