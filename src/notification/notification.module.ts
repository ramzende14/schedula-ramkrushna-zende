import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import { EmailController } from './email.controller';
import { Notification } from './notification.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
    ]),
  ],

  controllers: [
    EmailController,
  ],

  providers: [
    EmailService,
    NotificationService,
  ],

  exports: [
    EmailService,
    NotificationService,
  ],
})
export class NotificationModule {}