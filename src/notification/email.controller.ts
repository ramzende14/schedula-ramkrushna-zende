import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notification')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getNotifications(@Req() req) {
    return this.notificationService.getPatientNotifications(
      req.user.userId,
    );
  }

  @Post('test-email')
  async testEmail(@Body('email') email: string) {
    await this.emailService.sendEmail(
      email,
      'HospitalMS - Test Email',
      `
        <h2>HospitalMS Email Test</h2>
        <p>Your email notification service is working successfully.</p>
        <p>This is a test email from the NestJS backend.</p>
      `,
    );

    return {
      message: 'Test email sent successfully',
      email,
    };
  }

  @Post('verify-email')
  async verifyEmail() {
    return this.emailService.verifyConnection();
  }
}