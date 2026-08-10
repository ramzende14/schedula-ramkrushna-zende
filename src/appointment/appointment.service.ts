import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import {
  Appointment,
  AppointmentStatus,
} from './entity/appointment.entity';

import { DoctorProfile } from '../doctor/entity/doctor-profile.entity';
import { PatientProfile } from '../patient/entity/patient-profile.entity';

import {
  RecurringAvailability,
  SchedulingType,
} from '../availability/entity/recurring-availability.entity';
import { CustomAvailability } from '../availability/entity/custom-availability.entity';
import { computeDailySchedule, AvailableSlot } from '../availability/scheduling.engine';

import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification.entity';


@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,

    @InjectRepository(DoctorProfile)
    private doctorRepo: Repository<DoctorProfile>,

    @InjectRepository(PatientProfile)
    private patientRepo: Repository<PatientProfile>,

    @InjectRepository(RecurringAvailability)
    private availabilityRepo: Repository<RecurringAvailability>,

    @InjectRepository(CustomAvailability)
    private customRepo: Repository<CustomAvailability>,
    @InjectDataSource()
    private dataSource: DataSource,
    private readonly notificationService: NotificationService,
  ) { }

  /**
   * Execute a transactional function with automatic deadlock retry.
   * Retries up to 3 times when Postgres deadlock code '40P01' is encountered.
   */
  private async withTransaction<T>(work: (qr: import('typeorm').QueryRunner) => Promise<T>): Promise<T> {
    const maxRetries = 3;
    let attempt = 0;
    while (true) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();
      try {
        const result = await work(queryRunner);
        await queryRunner.commitTransaction();
        await queryRunner.release();
        return result;
      } catch (err: any) {
        if (queryRunner.isTransactionActive) await queryRunner.rollbackTransaction();
        await queryRunner.release();
        attempt++;
        const code = err && (err.code || err.errno || err.driverError && err.driverError.code);
        // Postgres deadlock: 40P01
        if (attempt < maxRetries && code === '40P01') {
          continue; // retry
        }
        throw err;
      }
    }
  }

  async createAppointment(
    userId: number,
    dto: CreateAppointmentDto,
  ) {
    // original implementation unchanged
    // Find patient
    const patient = await this.patientRepo.findOne({
      where: {
        user: {
          id: userId,
        },
      },
      relations: ['user'],
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Future date validation
    const appointmentDate = new Date(`${dto.date}T${dto.startTime}:00`);

    if (appointmentDate <= new Date()) {
      throw new BadRequestException('Appointment must be in the future');
    }

    // Validate and persist inside transaction to avoid stale data and races
    const appointmentResult = await this.withTransaction(async (qr) => {
      // Load doctor inside transaction to have latest state
      const doctorLocked = await qr.manager.findOne(DoctorProfile, { where: { id: dto.doctorId } });
      if (!doctorLocked) throw new NotFoundException('Doctor not found');

      // Use repositories bound to the transaction
      const recurringRepo = qr.manager.getRepository(RecurringAvailability);
      const customRepo = qr.manager.getRepository(CustomAvailability);
      const appointmentRepo = qr.manager.getRepository(Appointment);

      const schedule = await computeDailySchedule(doctorLocked.id, dto.date, recurringRepo, customRepo, appointmentRepo as any);
      if (!schedule || !schedule.availableSlots) throw new BadRequestException('Doctor is unavailable on this day');

      const chosen = schedule.availableSlots.find((s: AvailableSlot) => s.startTime === dto.startTime && s.endTime === dto.endTime);
      if (!chosen) throw new BadRequestException('Invalid appointment slot');

      // Single conflict check inside transaction (prevents duplicate queries)
      const conflict = await qr.manager
        .createQueryBuilder(Appointment, 'appointment')
        .setLock('pessimistic_write')
        .where('appointment.doctor_id = :doctorId', { doctorId: doctorLocked.id })
        .andWhere('appointment.date = :date', { date: dto.date })
        .andWhere('appointment.startTime = :startTime', { startTime: dto.startTime })
        .andWhere('appointment.endTime = :endTime', { endTime: dto.endTime })
        .andWhere('appointment.status = :status', { status: AppointmentStatus.BOOKED })
        .getOne();

      if (conflict) throw new ConflictException('Slot already booked');

      // Handle Wave reservation if needed
      if (chosen.availabilityId) {
        const recurring = await qr.manager
          .createQueryBuilder(RecurringAvailability, 'ra')
          .setLock('pessimistic_write')
          .where('ra.id = :id', { id: chosen.availabilityId })
          .getOne();

        if (recurring && recurring.schedulingType === SchedulingType.WAVE) {
          if (recurring.currentPatients >= (recurring.maxPatients ?? 0)) {
            throw new ConflictException('Wave is full');
          }
          recurring.currentPatients = (recurring.currentPatients ?? 0) + 1;
          await qr.manager.save(recurring);
        }
      }

      const newAppt = qr.manager.create(Appointment, {
  doctor: doctorLocked,
  patient,
  date: dto.date,
  startTime: dto.startTime,
  endTime: dto.endTime,
  status: AppointmentStatus.BOOKED,
});

const savedAppointment =
  await qr.manager.save(newAppt);

return {
  appointment: savedAppointment,
  doctorName: doctorLocked.fullName,
};
    });
    // Send booking email AFTER transaction succeeds
    try {
      await this.notificationService.sendBookingEmail({
        patientEmail: patient.user.email,
        patientName: patient.fullName,
        doctorName: appointmentResult.doctorName,
        date: appointmentResult.appointment.date,
        startTime: appointmentResult.appointment.startTime,
        endTime: appointmentResult.appointment.endTime,
      });
    } catch (error) {
      console.error(
        'Booking email failed, but appointment was created:',
        error,
      );
    }
    try {
  await this.notificationService.createAppointmentNotification({
    patient,
    appointment: appointmentResult.appointment,
    type: NotificationType.APPOINTMENT_BOOKED,
    title: 'Appointment Booked',
    message: `Your appointment with ${appointmentResult.doctorName} has been booked successfully for ${appointmentResult.appointment.date} at ${appointmentResult.appointment.startTime}.`,
    eventKey: `appointment-${appointmentResult.appointment.id}-booked`,
  });
} catch (error) {
  console.error(
    '❌ Booking notification creation failed:',
    error,
  );
}



  return appointmentResult.appointment;


  }

  async getMyAppointments(userId: number) {
    const patient = await this.patientRepo.findOne({
      where: {
        user: {
          id: userId,
        },
      },
      relations: ['user'],
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const appointments = await this.appointmentRepo.find({
      where: {
        patient: {
          id: patient.id,
        },
      },
      relations: ['doctor'],
      order: {
        date: 'ASC',
        startTime: 'ASC',
      },
    });

    if (appointments.length === 0) {
      throw new NotFoundException('No appointments found');
    }

    return appointments;
  }

  async getDoctorAppointments(userId: number) {
    const doctor = await this.doctorRepo.findOne({
      where: {
        user: {
          id: userId,
        },
      },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const appointments = await this.appointmentRepo.find({
      where: {
        doctor: {
          id: doctor.id,
        },
      },
      relations: ['patient'],
      order: {
        date: 'ASC',
        startTime: 'ASC',
      },
    });

    if (appointments.length === 0) {
      throw new NotFoundException('No appointments found');
    }

    return appointments;
  }

 async cancelAppointment(
  userId: number,
  appointmentId: number,
) {
  const result = await this.withTransaction(async (qr) => {

    // Lock appointment row
    const locked = await qr.manager
      .createQueryBuilder(Appointment, 'appointment')
      .setLock('pessimistic_write')
      .where('appointment.id = :id', {
        id: appointmentId,
      })
      .getOne();

    if (!locked) {
      throw new NotFoundException(
        'Appointment not found',
      );
    }

    // Load relations
    const appt = await qr.manager.findOne(
      Appointment,
      {
        where: {
          id: locked.id,
        },
        relations: [
          'patient',
          'patient.user',
          'doctor',
        ],
      },
    );

    if (!appt) {
      throw new NotFoundException(
        'Appointment not found',
      );
    }

    // Owner validation
    if (
      !appt.patient ||
      !appt.patient.user ||
      Number(appt.patient.user.id) !== Number(userId)
    ) {
      throw new ConflictException(
        'You cannot cancel this appointment',
      );
    }

    // Already cancelled
    if (
      appt.status === AppointmentStatus.CANCELLED
    ) {
      throw new ConflictException(
        'Appointment already cancelled',
      );
    }

    // Past appointment
    const appointmentDateTime =
      new Date(
        `${appt.date}T${appt.startTime}`,
      );

    if (appointmentDateTime < new Date()) {
      throw new BadRequestException(
        'Past appointments cannot be cancelled',
      );
    }

    // 30-minute cutoff
    this.validate30MinuteCutoff(
      appointmentDateTime,
    );

    // Find containing recurring availability
    const day =
      new Date(appt.date)
        .toLocaleDateString(
          'en-US',
          { weekday: 'long' },
        )
        .toUpperCase();

    const containing =
      await qr.manager
        .createQueryBuilder(
          RecurringAvailability,
          'avail',
        )
        .setLock('pessimistic_write')
        .where(
          'avail.doctor_id = :doctorId',
          {
            doctorId: appt.doctor.id,
          },
        )
        .andWhere(
          'avail.dayOfWeek = :day',
          { day },
        )
        .andWhere(
          'avail.startTime <= :startTime',
          {
            startTime: appt.startTime,
          },
        )
        .andWhere(
          'avail.endTime >= :endTime',
          {
            endTime: appt.endTime,
          },
        )
        .getOne();

    // Release Wave seat
    if (
      containing &&
      containing.schedulingType ===
        SchedulingType.WAVE
    ) {
      containing.currentPatients =
        Math.max(
          0,
          (containing.currentPatients ?? 1) - 1,
        );

      await qr.manager.save(containing);
    }

    // Cancel appointment
    appt.status =
      AppointmentStatus.CANCELLED;

    await qr.manager.save(appt);

    return {
      appointment: appt,
      patientEmail: appt.patient.user.email,
      patientName: appt.patient.fullName,
      doctorName: appt.doctor.fullName,
      date: appt.date,
      startTime: appt.startTime,
      endTime: appt.endTime,
    };
  });

  // =========================================
  // SEND EMAIL AFTER TRANSACTION SUCCESS
  // =========================================

  try {
    await this.notificationService.sendCancellationEmail({
      patientEmail: result.patientEmail,
      patientName: result.patientName,
      doctorName: result.doctorName,
      date: result.date,
      startTime: result.startTime,
      endTime: result.endTime,
    });

    console.log(
      '✅ Cancellation email sent successfully',
    );
  } catch (error) {
    console.error(
      '❌ Cancellation email failed, but appointment was cancelled:',
      error,
    );
  }
  try {
  await this.notificationService.createAppointmentNotification({
    patient: result.appointment?.patient,
    appointment: result.appointment,
    type: NotificationType.APPOINTMENT_CANCELLED,
    title: 'Appointment Cancelled',
    message: `Your appointment with ${result.doctorName} scheduled on ${result.date} at ${result.startTime} has been cancelled.`,
    eventKey: `appointment-${result.appointment.id}-cancelled`,
  });

  console.log('✅ Cancellation notification created successfully');
} catch (error) {
  console.error(
    '❌ Cancellation notification creation failed:',
    error,
  );
}

  return {
    message: 'Appointment cancelled successfully',
    appointment: result.appointment,
  };
}

  async getAvailableSlots(doctorId: number, date: string) {
    // Find doctor
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    // Use centralized scheduling engine to compute daily schedule and available slots
    const schedule = await computeDailySchedule(doctorId, date, this.availabilityRepo, this.customRepo, this.appointmentRepo);

    if (!schedule || !schedule.availableSlots || schedule.availableSlots.length === 0) {
      return {
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        specialization: doctor.specialization,
        consultationFee: doctor.consultationFee,
        date,
        totalAvailableSlots: 0,
        availableSlots: [],
      };
    }

    return {
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      specialization: doctor.specialization,
      consultationFee: doctor.consultationFee,
      date: schedule.date,
      totalAvailableSlots: schedule.totalAvailableSlots,
      availableSlots: schedule.availableSlots,
    };
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private toTime(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const minutes = (totalMinutes % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  async rescheduleAppointment(
  userId: number,
  appointmentId: number,
  dto: RescheduleAppointmentDto,
) {
  const result = await this.withTransaction(
    async (qr) => {

      // =========================================
      // LOCK APPOINTMENT
      // =========================================

      const locked = await qr.manager
        .createQueryBuilder(
          Appointment,
          'appointment',
        )
        .setLock('pessimistic_write')
        .where(
          'appointment.id = :id',
          { id: appointmentId },
        )
        .getOne();

      if (!locked) {
        throw new NotFoundException(
          'Appointment not found',
        );
      }

      // Load relations
      const appt =
        await qr.manager.findOne(
          Appointment,
          {
            where: {
              id: locked.id,
            },
            relations: [
              'patient',
              'patient.user',
              'doctor',
            ],
          },
        );

      if (!appt) {
        throw new NotFoundException(
          'Appointment not found',
        );
      }

      // =========================================
      // VALIDATION
      // =========================================

      if (
        !appt.patient?.user ||
        Number(appt.patient.user.id) !==
          Number(userId)
      ) {
        throw new BadRequestException(
          'You can only reschedule your own appointment',
        );
      }

      if (
        appt.status ===
        AppointmentStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Cancelled appointment cannot be rescheduled',
        );
      }

      const appointmentDateTime =
        new Date(
          `${appt.date}T${appt.startTime}:00`,
        );

      if (
        appointmentDateTime.getTime() <
        Date.now()
      ) {
        throw new BadRequestException(
          'Past appointments cannot be rescheduled',
        );
      }

      this.validate30MinuteCutoff(
        appointmentDateTime,
      );

      if (
        appt.date === dto.date &&
        appt.startTime === dto.startTime &&
        appt.endTime === dto.endTime
      ) {
        throw new BadRequestException(
          'Cannot reschedule to the same slot',
        );
      }

      // =========================================
      // SAVE OLD DETAILS FOR EMAIL
      // =========================================

      const oldDate = appt.date;
      const oldStartTime = appt.startTime;
      const oldEndTime = appt.endTime;

      // =========================================
      // NEW DATE VALIDATION
      // =========================================

      const requestedDateTime =
        new Date(
          `${dto.date}T${dto.startTime}:00`,
        );

      if (
        requestedDateTime.getTime() <=
        Date.now()
      ) {
        throw new BadRequestException(
          'Requested slot must be in the future',
        );
      }

      // =========================================
      // DOCTOR
      // =========================================

      const doctorLocked =
        await qr.manager.findOne(
          DoctorProfile,
          {
            where: {
              id: dto.doctorId,
            },
          },
        );

      if (!doctorLocked) {
        throw new NotFoundException(
          'Doctor not found',
        );
      }

      // =========================================
      // SCHEDULE
      // =========================================

      const recurringRepo =
        qr.manager.getRepository(
          RecurringAvailability,
        );

      const customRepo =
        qr.manager.getRepository(
          CustomAvailability,
        );

      const appointmentRepo =
        qr.manager.getRepository(
          Appointment,
        );

      const schedule =
        await computeDailySchedule(
          doctorLocked.id,
          dto.date,
          recurringRepo,
          customRepo,
          appointmentRepo,
        );

      if (
        !schedule ||
        !schedule.availableSlots
      ) {
        throw new BadRequestException(
          'Doctor is unavailable on this date',
        );
      }

      const chosen =
        schedule.availableSlots.find(
          (s: AvailableSlot) =>
            s.startTime === dto.startTime &&
            s.endTime === dto.endTime,
        );

      // =========================================
      // SLOT NOT AVAILABLE
      // =========================================

      if (!chosen) {
        const nextAvailable =
          await this.findNextAvailableSlot(
            dto.doctorId,
            dto.date,
            recurringRepo,
            customRepo,
            appointmentRepo,
            dto.startTime,
          );

        return {
          unavailable: true,
          nextAvailable,
        };
      }

      // =========================================
      // CONFLICT CHECK
      // =========================================

      const conflict =
        await qr.manager
          .createQueryBuilder(
            Appointment,
            'appointment',
          )
          .setLock('pessimistic_write')
          .where(
            'appointment.doctor_id = :doctorId',
            {
              doctorId: dto.doctorId,
            },
          )
          .andWhere(
            'appointment.date = :date',
            {
              date: dto.date,
            },
          )
          .andWhere(
            'appointment.startTime = :startTime',
            {
              startTime: dto.startTime,
            },
          )
          .andWhere(
            'appointment.endTime = :endTime',
            {
              endTime: dto.endTime,
            },
          )
          .andWhere(
            'appointment.status = :status',
            {
              status:
                AppointmentStatus.BOOKED,
            },
          )
          .andWhere(
            'appointment.id != :id',
            {
              id: appt.id,
            },
          )
          .getOne();

      // =========================================
      // WAVE / STREAM LOGIC
      // =========================================

      let oldRecurring:
        | RecurringAvailability
        | null = null;

      let newRecurring:
        | RecurringAvailability
        | null = null;

      // OLD RECURRING
      const oldDay =
        new Date(appt.date)
          .toLocaleDateString(
            'en-US',
            {
              weekday: 'long',
            },
          )
          .toUpperCase();

      oldRecurring =
        await qr.manager
          .createQueryBuilder(
            RecurringAvailability,
            'avail',
          )
          .setLock('pessimistic_write')
          .where(
            'avail.doctor_id = :doctorId',
            {
              doctorId: appt.doctor.id,
            },
          )
          .andWhere(
            'avail.dayOfWeek = :day',
            {
              day: oldDay,
            },
          )
          .andWhere(
            'avail.startTime <= :startTime',
            {
              startTime: appt.startTime,
            },
          )
          .andWhere(
            'avail.endTime >= :endTime',
            {
              endTime: appt.endTime,
            },
          )
          .getOne();

      // NEW RECURRING
      if (chosen.availabilityId) {
        newRecurring =
          await qr.manager
            .createQueryBuilder(
              RecurringAvailability,
              'ra',
            )
            .setLock('pessimistic_write')
            .where(
              'ra.id = :id',
              {
                id: chosen.availabilityId,
              },
            )
            .getOne();

        if (!newRecurring) {
          throw new BadRequestException(
            'Availability not found',
          );
        }

        // WAVE
        if (
          newRecurring.schedulingType ===
          SchedulingType.WAVE
        ) {
          if (
            newRecurring.currentPatients >=
            (newRecurring.maxPatients ?? 0)
          ) {
            const nextAvailable =
              await this.findNextAvailableSlot(
                dto.doctorId,
                dto.date,
                recurringRepo,
                customRepo,
                appointmentRepo,
                dto.startTime,
              );

            return {
              unavailable: true,
              nextAvailable,
            };
          }

          newRecurring.currentPatients =
            (newRecurring.currentPatients ?? 0) +
            1;

          await qr.manager.save(
            newRecurring,
          );
        }
      }

      // STREAM conflict
      if (
        conflict &&
        newRecurring &&
        newRecurring.schedulingType ===
          SchedulingType.STREAM
      ) {
        const nextAvailable =
          await this.findNextAvailableSlot(
            dto.doctorId,
            dto.date,
            recurringRepo,
            customRepo,
            appointmentRepo,
            dto.startTime,
          );

        return {
          unavailable: true,
          nextAvailable,
        };
      }

      // =========================================
      // RELEASE OLD WAVE SEAT
      // =========================================

      if (
        oldRecurring &&
        oldRecurring.schedulingType ===
          SchedulingType.WAVE
      ) {
        if (
          !newRecurring ||
          oldRecurring.id !==
            newRecurring.id
        ) {
          oldRecurring.currentPatients =
            Math.max(
              0,
              (oldRecurring.currentPatients ??
                1) - 1,
            );

          await qr.manager.save(
            oldRecurring,
          );
        }
      }

      // =========================================
      // UPDATE APPOINTMENT
      // =========================================

      appt.doctor = doctorLocked;
      appt.date = dto.date;
      appt.startTime = dto.startTime;
      appt.endTime = dto.endTime;

      await qr.manager.save(appt);

      return {
        unavailable: false,
        appointment: appt,

        patientEmail:
          appt.patient.user.email,

        patientName:
          appt.patient.fullName,

        doctorName:
          doctorLocked.fullName,

        oldDate,
        oldStartTime,
        oldEndTime,

        newDate: appt.date,
        newStartTime: appt.startTime,
        newEndTime: appt.endTime,
      };
    },
  );

  // =========================================
  // SLOT UNAVAILABLE
  // =========================================

  if (result.unavailable) {
  return {
    message: 'Requested slot unavailable',
    nextAvailable: result.nextAvailable,
  };
}

if (!result.appointment) {
  throw new BadRequestException(
    'Appointment not available after reschedule',
  );
}

// =========================================
// SEND RESCHEDULE EMAIL
// =========================================

try {
  await this.notificationService.sendRescheduleEmail({
    patientEmail: result.patientEmail ?? '',
    patientName: result.patientName ?? '',
    doctorName: result.doctorName ?? '',

    oldDate: result.oldDate ?? '',
    oldStartTime: result.oldStartTime ?? '',
    oldEndTime: result.oldEndTime ?? '',

    newDate: result.newDate ?? '',
    newStartTime: result.newStartTime ?? '',
    newEndTime: result.newEndTime ?? '',
  });

  console.log(
    '✅ Reschedule email sent successfully',
  );
} catch (error) {
  console.error(
    '❌ Reschedule email failed, but appointment was rescheduled:',
    error,
  );
}

// =========================================
// CREATE RESCHEDULE NOTIFICATION
// =========================================

try {
  await this.notificationService.createAppointmentNotification({
    patient: result.appointment.patient,
    appointment: result.appointment,

    type: NotificationType.APPOINTMENT_RESCHEDULED,

    title: 'Appointment Rescheduled',

    message: `Your appointment with ${result.doctorName} has been rescheduled to ${result.newDate} at ${result.newStartTime}.`,

    eventKey: `appointment-${result.appointment.id}-rescheduled`,
  });

  console.log(
    '✅ Reschedule notification created successfully',
  );
} catch (error) {
  console.error(
    '❌ Reschedule notification creation failed:',
    error,
  );
}

return {
  message: 'Appointment rescheduled successfully',
  appointment: result.appointment,
};

  return {
    message:
      'Appointment rescheduled successfully',

    appointment:
      result.appointment,
  };
}
  private async findPatient(userId: number) {
    const patient = await this.patientRepo.findOne({ where: { user: { id: userId } }, relations: ['user'] });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  private async findAppointment(appointmentId: number) {
    return this.appointmentRepo.findOne({ where: { id: appointmentId }, relations: ['patient', 'patient.user', 'doctor'] });
  }

  private isRecurringAvailability(x: any): x is RecurringAvailability {
    return !!x && typeof x.schedulingType !== 'undefined' && typeof x.startTime === 'string' && typeof x.endTime === 'string';
  }

  private isCustomAvailability(x: any): x is CustomAvailability {
    return !!x && typeof x.mode !== 'undefined' && typeof x.startTime === 'string' && typeof x.endTime === 'string';
  }

  private validateOwnership(appointment: Appointment, userId: number) {
    if (!appointment.patient || !appointment.patient.user || Number(appointment.patient.user.id) !== Number(userId)) {
      throw new BadRequestException('You can only reschedule your own appointment');
    }
  }

  private validate30MinuteCutoff(appointmentDateTime: Date) {
    const difference = (appointmentDateTime.getTime() - Date.now()) / (1000 * 60);
    if (difference <= 30) throw new BadRequestException('Appointment can only be rescheduled before 30 minutes');
  }

  private async findDoctorAvailability(doctorId: number, date: string, startTime?: string, endTime?: string): Promise<CustomAvailability | RecurringAvailability | null> {
    // Fetch all custom overrides and recurring windows for the date
    const customs = await this.customRepo.find({ where: { doctor: { id: doctorId }, date } });
    const day = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const recurrings = await this.availabilityRepo.find({ where: { doctor: { id: doctorId }, dayOfWeek: day } });

    if (startTime && endTime) {
      // Prefer a custom window that contains the requested slot
      for (const c of customs) {
        if (c.startTime <= startTime && c.endTime >= endTime && this.isCustomAvailability(c) && (c as CustomAvailability & { mode?: string }).mode !== 'BLOCK' && (c as CustomAvailability & { mode?: string }).mode !== 'HOLIDAY') return c;
      }

      // Otherwise find a recurring window that contains the slot
      for (const r of recurrings) {
        if (r.startTime <= startTime && r.endTime >= endTime) return r;
      }

      return null;
    }

    // No specific times requested: if any custom overrides exist return first, else return first recurring
    if (customs.length > 0) return customs[0];
    if (recurrings.length > 0) return recurrings[0];
    return null;
  }

  private generateSlots(availability: any) {
    const slots: { startTime: string; endTime: string }[] = [];
    let current = this.toMinutes(availability.startTime);
    const end = this.toMinutes(availability.endTime);
    const duration = (availability as RecurringAvailability).slotDuration !== undefined && (availability as RecurringAvailability).slotDuration !== null ? (availability as RecurringAvailability).slotDuration! : end - current;
    const buffer = (availability as RecurringAvailability).bufferTime !== undefined && (availability as RecurringAvailability).bufferTime !== null ? (availability as RecurringAvailability).bufferTime! : 0;
    while (current + duration <= end) {
      slots.push({ startTime: this.toTime(current), endTime: this.toTime(current + duration) });
      current += duration + buffer;
    }
    return slots;
  }

  private async findNextAvailableSlot(
    doctorId: number,
    date: string,
    recurringRepo: Repository<RecurringAvailability>,
    customRepo: Repository<CustomAvailability>,
    appointmentRepo: Repository<Appointment>,
    requestedStartTime?: string,
  ) {
    const maxDays = 30;
    let d = new Date(`${date}T00:00:00`);

    for (let i = 0; i < maxDays; i++) {

      const dayStr = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-');

      const schedule = await computeDailySchedule(
        doctorId,
        dayStr,
        recurringRepo,
        customRepo,
        appointmentRepo,
      );

      if (schedule.availableSlots.length > 0) {

        if (i === 0 && requestedStartTime) {

          const after = schedule.availableSlots.find(
            s =>
              !(s.startTime === requestedStartTime) &&
              this.toMinutes(s.startTime) >= this.toMinutes(requestedStartTime)
          );
          if (after) {
            return {
              date: schedule.date,
              startTime: after.startTime,
              endTime: after.endTime,
            };
          }

        } else {

          return {
            date: schedule.date,
            startTime: schedule.availableSlots[0].startTime,
            endTime: schedule.availableSlots[0].endTime,
          };

        }
      }

      d.setDate(d.getDate() + 1);
    }

    return null;
  }
}

