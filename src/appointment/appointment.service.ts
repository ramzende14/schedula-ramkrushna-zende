import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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

import { CreateAppointmentDto } from './dto/create-appointment.dto';
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
  ) {}

  async createAppointment(
    userId: number,
    dto: CreateAppointmentDto,
  ) {

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

  // Find doctor
  const doctor = await this.doctorRepo.findOne({
    where: {
      id: dto.doctorId,
    },
  });

  if (!doctor) {
    throw new NotFoundException('Doctor not found');
  }

  // Future date validation
  const appointmentDate = new Date(
    `${dto.date}T${dto.startTime}:00`,
  );

  if (appointmentDate <= new Date()) {
    throw new BadRequestException(
      'Appointment must be in the future',
    );
  }

  // Find doctor's availability
  const day = new Date(dto.date)
    .toLocaleDateString('en-US', {
      weekday: 'long',
    })
    .toUpperCase();

  const customAvailability = await this.customRepo.findOne({
  where: {
    doctor: { id: doctor.id },
    date: dto.date,
  },
});

const availability = customAvailability
  ? customAvailability
  : await this.availabilityRepo.findOne({
      where: {
        doctor: { id: doctor.id },
        dayOfWeek: day,
      },
    });

if (!availability) {
  throw new BadRequestException(
    'Doctor is unavailable on this day',
  );
}

  // Slot inside doctor's availability
 // Generate valid slots
const slots: {
  startTime: string;
  endTime: string;
}[] = [];

let current = this.toMinutes(availability.startTime);

const end = this.toMinutes(availability.endTime);

const duration =
  'slotDuration' in availability && availability.slotDuration !== undefined
    ? availability.slotDuration
    : end - current;

const buffer =
  'bufferTime' in availability && availability.bufferTime !== undefined
    ? availability.bufferTime
    : 0;

while (current + duration <= end) {
  slots.push({
    startTime: this.toTime(current),
    endTime: this.toTime(current + duration),
  });

  current += duration + buffer;
}

// Validate selected slot
const validSlot = slots.find(
  (slot) =>
    slot.startTime === dto.startTime &&
    slot.endTime === dto.endTime,
);

if (!validSlot) {
  throw new BadRequestException(
    'Invalid appointment slot',
  );
}

  // Duplicate booking
  const existing =
    await this.appointmentRepo.findOne({
      where: {
        doctor: {
          id: doctor.id,
        },
        date: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
      relations: ['doctor'],
    });

  if (existing) {
    throw new ConflictException(
      'Slot already booked',
    );
  }

  // Save appointment
  const appointment =
    this.appointmentRepo.create({
      doctor,
      patient,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      status: AppointmentStatus.BOOKED,
    });

  

  if (
  'schedulingType' in availability &&
  availability.schedulingType === SchedulingType.WAVE
){
  if (
    availability.currentPatients >=
    (availability.maxPatients ?? 0)
  ) {
    throw new ConflictException('Wave is full');
  }

  availability.currentPatients++;


  await this.availabilityRepo.save(availability);
}

const savedAppointment =
  await this.appointmentRepo.save(appointment);

return savedAppointment;
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
    throw new NotFoundException(
      'Patient not found',
    );
  }

  const appointments =
    await this.appointmentRepo.find({
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
    throw new NotFoundException(
      'No appointments found',
    );
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
    throw new NotFoundException(
      'Doctor not found',
    );
  }

  const appointments =
    await this.appointmentRepo.find({
      where: {
        doctor: {
          id: doctor.id,
        },
      },
      relations: [
        'patient',
      ],
      order: {
        date: 'ASC',
        startTime: 'ASC',
      },
    });

  if (appointments.length === 0) {
    throw new NotFoundException(
      'No appointments found',
    );
  }

  return appointments;
}
  async cancelAppointment(
    userId: number,
    appointmentId: number,
  ) {

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
    throw new NotFoundException(
      'Patient not found',
    );
  }

  // Find appointment
  const appointment =
    await this.appointmentRepo.findOne({
      where: {
        id: appointmentId,
      },
      relations: [
        'patient',
        'doctor',
      ],
    });

  if (!appointment) {
    throw new NotFoundException(
      'Appointment not found',
    );
  }

  // Owner validation
  if (
    appointment.patient.id !==
    patient.id
  ) {
    throw new ConflictException(
      'You cannot cancel this appointment',
    );
  }

  // Already cancelled
  if (
    appointment.status ===
    AppointmentStatus.CANCELLED
  ) {
    throw new ConflictException(
      'Appointment already cancelled',
    );
  }

  // Past appointment validation
  const appointmentDateTime = new Date(
    `${appointment.date}T${appointment.startTime}`
  );

  if (appointmentDateTime < new Date()) {
    throw new BadRequestException(
      'Past appointments cannot be cancelled',
    );
  }
  const day = new Date(appointment.date)
  .toLocaleDateString('en-US', {
    weekday: 'long',
  })
  .toUpperCase();

const availability =
  await this.availabilityRepo.findOne({
    where: {
      doctor: {
        id: appointment.doctor.id,
      },
      dayOfWeek: day,
    },
  });

if (
  availability &&
  availability.schedulingType === SchedulingType.WAVE &&
  availability.currentPatients > 0
) {
  availability.currentPatients--;

  await this.availabilityRepo.save(
    availability,
  );
}

  // Cancel
  appointment.status =
    AppointmentStatus.CANCELLED;

  await this.appointmentRepo.save(
    appointment,
  );

  return {
    message:
      'Appointment cancelled successfully',
  };
}
async getAvailableSlots(
  doctorId: number,
  date: string,
) {
  // Find doctor
  const doctor = await this.doctorRepo.findOne({
    where: { id: doctorId },
  });

  if (!doctor) {
    throw new NotFoundException('Doctor not found');
  }

  // Check custom availability first
  const customAvailability = await this.customRepo.findOne({
    where: {
      doctor: { id: doctor.id },
      date,
    },
  });

  // Find recurring availability if no custom availability
  let availability: any = customAvailability;

  if (!availability) {
    const day = new Date(date)
      .toLocaleDateString('en-US', {
        weekday: 'long',
      })
      .toUpperCase();

    availability = await this.availabilityRepo.findOne({
      where: {
        doctor: { id: doctor.id },
        dayOfWeek: day,
      },
    });
  }

  if (!availability) {
    throw new BadRequestException(
      'Doctor is unavailable on this day',
    );
  }
  // Generate valid slots
const slots: {
  startTime: string;
  endTime: string;
}[] = [];

let current = this.toMinutes(
  availability.startTime,
);

const end = this.toMinutes(
  availability.endTime,
);

const duration =
  availability.slotDuration ??
  end - current;

const buffer =
  availability.bufferTime ?? 0;

while (current + duration <= end) {
  slots.push({
    startTime: this.toTime(current),
    endTime: this.toTime(current + duration),
  });

  current += duration + buffer;
}

  // Get booked appointments
  const booked = await this.appointmentRepo
  .createQueryBuilder('appointment')
  .leftJoin('appointment.doctor', 'doctor')
  .where('doctor.id = :doctorId', {
    doctorId,
  })
  .andWhere('appointment.date = :date', {
    date,
  })
  .andWhere('appointment.status = :status', {
    status: AppointmentStatus.BOOKED,
  })

  .getMany();
  
  // Remove booked slots
  const availableSlots = slots.filter(
  (slot) =>
    !booked.some((appointment) => {
      const bookedStart = appointment.startTime
        .toString()
        .substring(0, 5);

      const bookedEnd = appointment.endTime
        .toString()
        .substring(0, 5);

      return (
        bookedStart === slot.startTime &&
        bookedEnd === slot.endTime
      );
    }),
);

  return {
    doctorId: doctor.id,
    doctorName: doctor.fullName,
    specialization: doctor.specialization,
    consultationFee: doctor.consultationFee,
    date,
   
    totalAvailableSlots:
      availableSlots.length,
    availableSlots: availableSlots.map((slot) => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: 'AVAILABLE',
    })),
  };
}

private toMinutes(time: string): number {
  const [hours, minutes] = time
    .split(':')
    .map(Number);

  return hours * 60 + minutes;
}

private toTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0');

  const minutes = (totalMinutes % 60)
    .toString()
    .padStart(2, '0');

  return `${hours}:${minutes}`;
}
}

