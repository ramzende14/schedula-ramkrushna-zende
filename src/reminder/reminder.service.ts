import {
    Injectable,
    Logger,
} from '@nestjs/common';

import { Cron, CronExpression } from '@nestjs/schedule';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import {
    Appointment,
    AppointmentStatus,
} from '../appointment/entity/appointment.entity';

import {
    Notification,
    NotificationType,
} from '../notification/notification.entity';

import { NotificationService } from '../notification/notification.service';

import {
    RecurringAvailability,
    SchedulingType,
} from '../availability/entity/recurring-availability.entity';

import { CustomAvailability } from '../availability/entity/custom-availability.entity';


@Injectable()
export class ReminderService {

    private readonly logger =
        new Logger(ReminderService.name);

    private readonly reminderWindowMinutes =
        Number(process.env.REMINDER_WINDOW_MINUTES ?? 30);


    constructor(

        @InjectRepository(Appointment)
        private readonly appointmentRepository:
            Repository<Appointment>,

        @InjectRepository(RecurringAvailability)
        private readonly recurringRepository:
            Repository<RecurringAvailability>,

        @InjectRepository(CustomAvailability)
        private readonly customRepository:
            Repository<CustomAvailability>,

        private readonly notificationService:
            NotificationService,

        @InjectRepository(Notification)
        private readonly notificationRepository:
            Repository<Notification>,
    ) { }


    /**
     * Runs every minute.
     */
    @Cron(CronExpression.EVERY_MINUTE)
    async processAppointmentReminders() {

        this.logger.log('🔔 REMINDER CRON RUNNING');

        this.logger.log(
            'Checking appointments for reminders...',
        );

        try {

            const appointments =
                await this.appointmentRepository.find({
                    where: {
                        status: AppointmentStatus.BOOKED,
                    },

                    relations: [
                        'doctor',
                        'patient',
                        'patient.user',
                    ],

                    order: {
                        date: 'ASC',
                        startTime: 'ASC',
                    },
                });


            for (const appointment of appointments) {

                try {

                    await this.processAppointment(
                        appointment,
                    );

                } catch (error) {

                    this.logger.error(
                        `Reminder processing failed for appointment ${appointment.id}`,
                        error,
                    );

                }

            }

        } catch (error) {

            this.logger.error(
                'Reminder Cron failed',
                error,
            );

        }
    }


    private async processAppointment(
        appointment: Appointment,
    ) {

        /**
         * Don't process invalid appointments.
         */
        if (
            !appointment.date ||
            !appointment.startTime ||
            !appointment.doctor ||
            !appointment.patient?.user
        ) {

            this.logger.warn(
                `Skipping invalid appointment ${appointment.id}`,
            );

            return;
        }


        /**
         * Check appointment date/time.
         */
        const appointmentDateTime =
            this.createAppointmentDateTime(
                appointment.date,
                appointment.startTime,
            );


        const now = new Date();


        /**
         * Already started / already passed.
         */
        if (
            appointmentDateTime.getTime() <=
            now.getTime()
        ) {

            return;
        }


        /**
         * Calculate minutes until appointment.
         */
        const differenceMs =
            appointmentDateTime.getTime() -
            now.getTime();

        const minutesUntilAppointment =
            differenceMs / (1000 * 60);


        /**
         * Reminder window.
         *
         * Example:
         *
         * REMINDER_WINDOW_MINUTES=30
         *
         * Appointment at 10:00
         * Cron at 09:30 -> reminder
         */
        if (
            minutesUntilAppointment >
            this.reminderWindowMinutes
        ) {

            return;
        }


        /**
         * Prevent duplicate reminder.
         */
        const eventKey =
            `appointment-${appointment.id}-reminder`;


        const existing =
            await this.notificationRepository.findOne({
                where: {
                    eventKey,
                },
            });


        if (existing) {

            this.logger.debug(
                `Reminder already generated for appointment ${appointment.id}`,
            );

            return;
        }


        /**
         * Find scheduling type.
         */
        const schedulingType =
            await this.getSchedulingType(
                appointment,
            );


        if (!schedulingType) {

            this.logger.warn(
                `Scheduling type not found for appointment ${appointment.id}`,
            );

            return;
        }


        /**
         * Create reminder content.
         */
        let title: string;
        let message: string;
        let tokenNumber: number | null = null;

        if (schedulingType === SchedulingType.STREAM) {

            title = 'Upcoming Appointment Reminder';

            message =
                `Reminder: You have an appointment with ` +
                `${appointment.doctor.fullName} on ` +
                `${appointment.date} at ` +
                `${appointment.startTime}.`;

        } else if (schedulingType === SchedulingType.WAVE) {

            tokenNumber =
                await this.calculateWaveToken(appointment);

            title = 'Upcoming Appointment Reminder';

            message =
                `Reminder: You have an appointment with ` +
                `${appointment.doctor.fullName} today.\n\n` +
                `Reporting Time: ${appointment.startTime}\n` +
                `Token Number: ${tokenNumber}`;

        } else {

            this.logger.warn(
                `Unsupported scheduling type for appointment ${appointment.id}`,
            );

            return;
        }


        /**
         * Create DB notification
         */
        await this.notificationService.createAppointmentNotification({

            patient: appointment.patient,

            appointment,

            type:
                NotificationType.APPOINTMENT_REMINDER,

            title,

            message,

            eventKey,
        });


        /**
         * Send professional reminder email
         */
        await this.notificationService.sendReminderEmail({

            patientEmail:
                appointment.patient.user.email,

            patientName:
                appointment.patient.fullName,

            doctorName:
                appointment.doctor.fullName,

            date:
                appointment.date,

            startTime:
                appointment.startTime,

            endTime:
                appointment.endTime,

            schedulingType,

            tokenNumber,
        });


        this.logger.log(
            `Reminder generated for appointment ${appointment.id}`,
        );
    }


    private async getSchedulingType(
        appointment: Appointment,
    ): Promise<SchedulingType | null> {

        /**
         * First check recurring availability.
         */
        const recurring =
            await this.recurringRepository.findOne({
                where: {
                    id: appointment.availabilityId,
                },
            });


        if (recurring) {

            return recurring.schedulingType;
        }


        /**
         * Then check custom availability.
         */
        const custom =
            await this.customRepository.findOne({
                where: {
                    id: appointment.availabilityId,
                },
            });


        if (custom) {

            return custom.schedulingType;
        }


        return null;
    }


    private createAppointmentDateTime(
        date: string,
        time: string,
    ): Date {

        const cleanTime =
            time.substring(0, 8);

        return new Date(
            `${date}T${cleanTime}`,
        );
    }


    /**
     * Temporary Wave token calculation.
     *
     * IMPORTANT:
     * We should replace this with your
     * actual Wave token logic if your
     * scheduling engine already defines it.
     */
    private async calculateWaveToken(
        appointment: Appointment,
    ): Promise<number> {

        const appointments =
            await this.appointmentRepository.find({
                where: {
                    doctor: {
                        id: appointment.doctor.id,
                    },

                    date: appointment.date,

                    availabilityId:
                        appointment.availabilityId,

                    status:
                        AppointmentStatus.BOOKED,
                },

                order: {
                    startTime: 'ASC',
                    id: 'ASC',
                },
            });


        const index =
            appointments.findIndex(
                a => a.id === appointment.id,
            );


        return index >= 0
            ? index + 1
            : 1;
    }
}