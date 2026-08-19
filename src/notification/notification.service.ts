import { Injectable } from '@nestjs/common';
import { EmailService } from './email.service';
import { emailLayout } from './templates/email-layout';
import { appointmentDetails } from './templates/appointment-details';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PatientProfile } from '../patient/entity/patient-profile.entity';
import { Appointment } from '../appointment/entity/appointment.entity';
import {
  Notification,
  NotificationType,
} from './notification.entity';
import { SchedulingType } from '../availability/enum/scheduling-type.enum';

@Injectable()
export class NotificationService {
 constructor(
  private readonly emailService: EmailService,

  @InjectRepository(Notification)
  private readonly notificationRepository: Repository<Notification>,
) {}

  // =========================
  // TEST EMAIL
  // =========================

  async sendTestNotification(email: string) {
    await this.emailService.sendEmail(
      email,
      'HospitalMS - Test Notification',
      `
        <h2>HospitalMS</h2>

        <p>
          Email notification service is working successfully.
        </p>
      `,
    );

    return {
      message: 'Notification email sent successfully',
      email,
    };
  }

  // =========================
  // BOOKING EMAIL
  // =========================

  async sendBookingEmail(data: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  date: string;
  startTime: string;
  endTime: string;
}) {

  const details = appointmentDetails({
    doctorName: data.doctorName,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
  });

  const content = `
    <div style="text-align:center;">

      <div style="
        display:inline-block;
        background:#dcfce7;
        color:#166534;
        padding:8px 16px;
        border-radius:20px;
        font-size:13px;
        font-weight:bold;
      ">
        ✓ CONFIRMED
      </div>

      <h1 style="
        margin:20px 0 10px;
        color:#0f172a;
        font-size:24px;
      ">
        Appointment Confirmed
      </h1>

    </div>

    <p style="
      color:#334155;
      font-size:15px;
      line-height:1.7;
    ">
      Hello <strong>${data.patientName}</strong>,
    </p>

    <p style="
      color:#64748b;
      font-size:14px;
      line-height:1.7;
    ">
      Your appointment has been successfully confirmed.
      Please find your appointment details below.
    </p>

    ${details}

    <div style="text-align:center;margin:30px 0;">

      <a
        href="http://localhost:3000"
        style="
          display:inline-block;
          background:#2563eb;
          color:#ffffff;
          text-decoration:none;
          padding:12px 24px;
          border-radius:7px;
          font-size:14px;
          font-weight:bold;
        "
      >
        View Appointment
      </a>

    </div>

    <p style="
      color:#64748b;
      font-size:13px;
      line-height:1.6;
    ">
      Please arrive a few minutes before your scheduled
      appointment time.
    </p>
  `;

  await this.emailService.sendEmail(
    data.patientEmail,
    'Appointment Confirmed | HospitalMS',
    emailLayout(
      'Appointment Confirmed',
      content,
    ),
  );

}
async sendCancellationEmail(data: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  date: string;
  startTime: string;
  endTime: string;
}) {

  const details = appointmentDetails({
    doctorName: data.doctorName,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
  });

  const content = `
    <div style="text-align:center;">

      <div style="
        display:inline-block;
        background:#fee2e2;
        color:#991b1b;
        padding:8px 16px;
        border-radius:20px;
        font-size:13px;
        font-weight:bold;
      ">
        CANCELLED
      </div>

      <h1 style="
        margin:20px 0 10px;
        color:#0f172a;
        font-size:24px;
      ">
        Appointment Cancelled
      </h1>

    </div>

    <p style="
      color:#334155;
      font-size:15px;
      line-height:1.7;
    ">
      Hello <strong>${data.patientName}</strong>,
    </p>

    <p style="
      color:#64748b;
      font-size:14px;
      line-height:1.7;
    ">
      Your appointment has been successfully cancelled.
    </p>

    ${details}

    <p style="
      color:#64748b;
      font-size:13px;
      line-height:1.7;
    ">
      You can book another available appointment through
      HospitalMS whenever you are ready.
    </p>
  `;

  await this.emailService.sendEmail(
    data.patientEmail,
    'Appointment Cancelled | HospitalMS',
    emailLayout(
      'Appointment Cancelled',
      content,
    ),
  );
}
async sendRescheduleEmail(data: {
  patientEmail: string;
  patientName: string;
  doctorName: string;

  oldDate: string;
  oldStartTime: string;
  oldEndTime: string;

  newDate: string;
  newStartTime: string;
  newEndTime: string;
}) {

  const content = `
    <div style="text-align:center;">

      <div style="
        display:inline-block;
        background:#fef3c7;
        color:#92400e;
        padding:8px 16px;
        border-radius:20px;
        font-size:13px;
        font-weight:bold;
      ">
        RESCHEDULED
      </div>

      <h1 style="
        margin:20px 0 10px;
        color:#0f172a;
        font-size:24px;
      ">
        Appointment Rescheduled
      </h1>

    </div>

    <p style="
      color:#334155;
      font-size:15px;
      line-height:1.7;
    ">
      Hello <strong>${data.patientName}</strong>,
    </p>

    <p style="
      color:#64748b;
      font-size:14px;
      line-height:1.7;
    ">
      Your appointment with
      <strong>${data.doctorName}</strong>
      has been rescheduled.
    </p>

    <!-- OLD -->
    <div style="
      background:#f8fafc;
      border:1px solid #e2e8f0;
      border-radius:10px;
      padding:20px;
      margin:20px 0;
    ">

      <p style="
        margin:0 0 10px;
        color:#94a3b8;
        font-size:12px;
        font-weight:bold;
      ">
        PREVIOUS APPOINTMENT
      </p>

      <p style="margin:7px 0;color:#64748b;">
        ${data.oldDate}
      </p>

      <p style="
        margin:7px 0;
        color:#64748b;
        text-decoration:line-through;
      ">
        ${data.oldStartTime} - ${data.oldEndTime}
      </p>

    </div>

    <div style="
      text-align:center;
      font-size:24px;
      color:#2563eb;
    ">
      ↓
    </div>

    <!-- NEW -->
    <div style="
      background:#eff6ff;
      border:2px solid #2563eb;
      border-radius:10px;
      padding:20px;
      margin:20px 0;
    ">

      <p style="
        margin:0 0 10px;
        color:#2563eb;
        font-size:12px;
        font-weight:bold;
      ">
        NEW APPOINTMENT
      </p>

      <p style="
        margin:7px 0;
        color:#1e3a8a;
        font-weight:bold;
      ">
        ${data.newDate}
      </p>

      <p style="
        margin:7px 0;
        color:#1e3a8a;
        font-weight:bold;
      ">
        ${data.newStartTime} - ${data.newEndTime}
      </p>

    </div>

    <p style="
      color:#64748b;
      font-size:13px;
    ">
      Please make a note of your new appointment time.
    </p>
  `;

  await this.emailService.sendEmail(
    data.patientEmail,
    'Appointment Rescheduled | HospitalMS',
    emailLayout(
      'Appointment Rescheduled',
      content,
    ),
  );
}
async sendShrinkEmail(data: {
  patientEmail: string;
  patientName: string;
  doctorName: string;

  oldDate: string;
  oldStartTime: string;
  oldEndTime: string;

  suggestedDate: string | null;
  suggestedStartTime: string | null;
  suggestedEndTime: string | null;
}) {

  const hasSuggestion =
    data.suggestedDate &&
    data.suggestedStartTime &&
    data.suggestedEndTime;

  const suggestionHtml = hasSuggestion
    ? `
      <div style="
        background:#eff6ff;
        border:2px solid #2563eb;
        border-radius:10px;
        padding:20px;
        margin:25px 0;
      ">

        <p style="
          margin:0 0 10px;
          color:#2563eb;
          font-size:12px;
          font-weight:bold;
        ">
          RECOMMENDED ALTERNATIVE
        </p>

        <p style="
          margin:8px 0;
          color:#1e3a8a;
          font-weight:bold;
        ">
          ${data.suggestedDate}
        </p>

        <p style="
          margin:8px 0;
          color:#1e3a8a;
          font-weight:bold;
        ">
          ${data.suggestedStartTime}
          -
          ${data.suggestedEndTime}
        </p>

      </div>

      <div style="text-align:center;margin:25px 0;">

        <a
          href="http://localhost:3000"
          style="
            display:inline-block;
            background:#2563eb;
            color:white;
            text-decoration:none;
            padding:12px 25px;
            border-radius:7px;
            font-size:14px;
            font-weight:bold;
          "
        >
          Review Appointment
        </a>

      </div>
    `
    : `
      <div style="
        background:#fff7ed;
        border:1px solid #fed7aa;
        border-radius:10px;
        padding:20px;
        margin:25px 0;
      ">

        <p style="
          margin:0;
          color:#9a3412;
          font-size:14px;
        ">
          No nearby alternative slot is currently available.
          Please open HospitalMS to select another available slot.
        </p>

      </div>
    `;

  const content = `
    <div style="text-align:center;">

      <div style="
        display:inline-block;
        background:#fff7ed;
        color:#9a3412;
        padding:8px 16px;
        border-radius:20px;
        font-size:13px;
        font-weight:bold;
      ">
        ACTION REQUIRED
      </div>

      <h1 style="
        margin:20px 0 10px;
        color:#0f172a;
        font-size:24px;
      ">
        Appointment Change Required
      </h1>

    </div>

    <p style="
      color:#334155;
      font-size:15px;
      line-height:1.7;
    ">
      Hello <strong>${data.patientName}</strong>,
    </p>

    <p style="
      color:#64748b;
      font-size:14px;
      line-height:1.7;
    ">
      Dr. <strong>${data.doctorName}</strong>
      has reduced their availability for
      <strong>${data.oldDate}</strong>.
    </p>

    <div style="
      background:#fef2f2;
      border:1px solid #fecaca;
      border-radius:10px;
      padding:20px;
      margin:25px 0;
    ">

      <p style="
        margin:0 0 10px;
        color:#991b1b;
        font-size:12px;
        font-weight:bold;
      ">
        AFFECTED APPOINTMENT
      </p>

      <p style="
        margin:7px 0;
        color:#7f1d1d;
      ">
        ${data.oldDate}
      </p>

      <p style="
        margin:7px 0;
        color:#7f1d1d;
        text-decoration:line-through;
      ">
        ${data.oldStartTime} - ${data.oldEndTime}
      </p>

    </div>

    <p style="
      color:#64748b;
      font-size:14px;
      line-height:1.7;
    ">
      We found the nearest available alternative for you:
    </p>

    ${suggestionHtml}

    <p style="
      color:#64748b;
      font-size:12px;
      line-height:1.6;
    ">
      Please review the suggested slot and confirm your
      appointment in HospitalMS.
    </p>
  `;

  await this.emailService.sendEmail(
    data.patientEmail,
    'Action Required: Appointment Change | HospitalMS',
    emailLayout(
      'Appointment Change Required',
      content,
    ),
  );
}
async createAppointmentNotification(data: {
  patient: PatientProfile;
  appointment: Appointment;
  type: NotificationType;
  title: string;
  message: string;
  eventKey: string;
}) {
  const existing =
    await this.notificationRepository.findOne({
      where: {
        eventKey: data.eventKey,
      },
    });

  if (existing) {
    return existing;
  }

  const notification =
    this.notificationRepository.create({
      patient: data.patient,
      appointment: data.appointment,
      type: data.type,
      title: data.title,
      message: data.message,
      eventKey: data.eventKey,
    });

  return this.notificationRepository.save(
    notification,
  );
}
async getPatientNotifications(userId: number) {
  return this.notificationRepository.find({
    where: {
      patient: {
        user: {
          id: userId,
        },
      },
    },
    relations: [
      'patient',
      'appointment',
      'appointment.doctor',
    ],
    order: {
      createdAt: 'DESC',
    },
  });
}
async sendReminderEmail(data: {
  patientEmail: string;
  patientName: string;
  doctorName: string;
  date: string;
  startTime: string;
  endTime: string;
  schedulingType: SchedulingType;
  tokenNumber: number | null;
}) {

  const isWave =
    data.schedulingType === SchedulingType.WAVE;

  const appointmentInfo = isWave
    ? `
      <div style="
        background:#eff6ff;
        border:1px solid #bfdbfe;
        border-radius:12px;
        padding:22px;
        margin:25px 0;
      ">

        <p style="
          margin:0 0 15px;
          color:#2563eb;
          font-size:12px;
          font-weight:bold;
          letter-spacing:1px;
        ">
          WAVE APPOINTMENT
        </p>

        <p style="
          margin:8px 0;
          color:#334155;
          font-size:14px;
        ">
          <strong>Doctor:</strong>
          ${data.doctorName}
        </p>

        <p style="
          margin:8px 0;
          color:#334155;
          font-size:14px;
        ">
          <strong>Reporting Time:</strong>
          ${data.startTime}
        </p>

        <div style="
          background:#2563eb;
          border-radius:10px;
          padding:18px;
          margin-top:18px;
          text-align:center;
        ">

          <p style="
            margin:0 0 5px;
            color:#dbeafe;
            font-size:12px;
            font-weight:bold;
            text-transform:uppercase;
          ">
            Your Token Number
          </p>

          <p style="
            margin:0;
            color:#ffffff;
            font-size:36px;
            font-weight:bold;
          ">
            ${data.tokenNumber}
          </p>

        </div>

      </div>
    `
    : `
      <div style="
        background:#f0fdf4;
        border:1px solid #bbf7d0;
        border-radius:12px;
        padding:22px;
        margin:25px 0;
      ">

        <p style="
          margin:0 0 15px;
          color:#15803d;
          font-size:12px;
          font-weight:bold;
          letter-spacing:1px;
        ">
          STREAM APPOINTMENT
        </p>

        <p style="
          margin:8px 0;
          color:#334155;
          font-size:14px;
        ">
          <strong>Doctor:</strong>
          ${data.doctorName}
        </p>

        <p style="
          margin:8px 0;
          color:#334155;
          font-size:14px;
        ">
          <strong>Date:</strong>
          ${data.date}
        </p>

        <p style="
          margin:8px 0;
          color:#334155;
          font-size:14px;
        ">
          <strong>Appointment Time:</strong>
          ${data.startTime} - ${data.endTime}
        </p>

      </div>
    `;

  const content = `
    <div style="text-align:center;">

      <div style="
        display:inline-block;
        background:#fef3c7;
        color:#92400e;
        padding:8px 16px;
        border-radius:20px;
        font-size:12px;
        font-weight:bold;
        letter-spacing:.5px;
      ">
        APPOINTMENT REMINDER
      </div>

      <h1 style="
        margin:20px 0 10px;
        color:#0f172a;
        font-size:26px;
      ">
        Your Appointment Is Coming Up
      </h1>

    </div>

    <p style="
      color:#334155;
      font-size:15px;
      line-height:1.7;
    ">
      Hello <strong>${data.patientName}</strong>,
    </p>

    <p style="
      color:#64748b;
      font-size:14px;
      line-height:1.7;
    ">
      This is a friendly reminder that you have an upcoming
      appointment with <strong>${data.doctorName}</strong>.
      Please review the details below.
    </p>

    ${appointmentInfo}

    <div style="
      background:#f8fafc;
      border-left:4px solid #2563eb;
      padding:15px 18px;
      margin:25px 0;
    ">

      <p style="
        margin:0;
        color:#475569;
        font-size:13px;
        line-height:1.6;
      ">
        Please arrive / be ready a few minutes before your
        scheduled appointment time to ensure a smooth
        consultation.
      </p>

    </div>

    <p style="
      color:#64748b;
      font-size:13px;
      line-height:1.6;
    ">
      If you are unable to attend your appointment, please
      cancel or reschedule it through HospitalMS in advance.
    </p>

    <p style="
      margin-top:28px;
      color:#334155;
      font-size:14px;
    ">
      Thank you for choosing <strong>HospitalMS</strong>.
    </p>
  `;

  await this.emailService.sendEmail(
    data.patientEmail,
    'Appointment Reminder | HospitalMS',
    emailLayout(
      'Appointment Reminder',
      content,
    ),
  );
}
}