import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter =
    nodemailer.createTransport({
      service: 'gmail',

      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },

      logger: true,
      debug: true,
    });

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();

      console.log('✅ Gmail SMTP connection successful');

      return true;
    } catch (error) {
      console.error(
        '❌ Gmail SMTP connection failed:',
        error,
      );

      return false;
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject,
        html,
      });

      console.log(`✅ Email sent successfully to ${to}`);
    } catch (error) {
      console.error('❌ Email sending failed:', error);

      throw new InternalServerErrorException(
        'Failed to send email',
      );
    }
  }
}