import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RecurringAvailability, SchedulingType } from './entity/recurring-availability.entity';
import { CustomAvailability } from './entity/custom-availability.entity';
import { DoctorProfile } from '../doctor/entity/doctor-profile.entity';
import { Appointment, AppointmentStatus } from '../appointment/entity/appointment.entity';
import { computeDailySchedule, findNearestSlotBeforeShrink, findShrinkAlternatives } from './scheduling.engine';

import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { CreateOverrideDto } from './dto/create-override.dto';
import { ExpandAvailabilityDto } from './dto/expand-availability.dto';
import { ShrinkAvailabilityDto } from './dto/shrink-availability.dto';

import { NotificationService } from '../notification/notification.service';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(RecurringAvailability)
    private recurringRepo: Repository<RecurringAvailability>,

    @InjectRepository(CustomAvailability)
    private customRepo: Repository<CustomAvailability>,

    @InjectRepository(DoctorProfile)
    private doctorRepo: Repository<DoctorProfile>,
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
    private readonly notificationService: NotificationService,
  ) { }

  // Create recurring availability
  async createRecurring(userId: number, dto: CreateRecurringDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }


    this.validateTimeRange(dto.startTime, dto.endTime);

    const slots = await this.recurringRepo.find({
      where: {
        doctor: { id: doctor.id },
        dayOfWeek: dto.dayOfWeek,
      },
    });


    for (const slot of slots) {
      if (
        this.isOverlapping(
          dto.startTime,
          dto.endTime,
          slot.startTime,
          slot.endTime,
        )
      ) {
        throw new ConflictException(
          'Overlapping availability slot',
        );
      }
    }


    const duplicate = await this.recurringRepo.findOne({
      where: {
        doctor: { id: doctor.id },
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
      relations: ['doctor'],
    });

    if (duplicate) {
      throw new ConflictException('Duplicate availability');
    }
    if (dto.schedulingType === SchedulingType.STREAM) {
      if (!dto.slotDuration) {
        throw new BadRequestException(
          'Slot duration is required',
        );
      }

      if (dto.slotDuration < 30) {
        throw new BadRequestException(
          'Stream slot duration should be at least 30 minutes',
        );
      }
    }

    if (dto.schedulingType === SchedulingType.WAVE) {
      if (!dto.slotDuration) {
        throw new BadRequestException(
          'Slot duration is required',
        );
      }

      if (dto.slotDuration < 5 || dto.slotDuration > 15) {
        throw new BadRequestException(
          'Wave slot duration should be between 5 and 15 minutes',
        );
      }
    }

    // WAVE validation


    const availability = this.recurringRepo.create({
      ...dto,
      currentPatients: 0,
      doctor,
    });

    return await this.recurringRepo.save(availability);
  } // <-- createRecurring() 

  // Get recurring availability


  // Get recurring availability
  async getRecurring(userId: number) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    return this.recurringRepo.find({
      where: {
        doctor: { id: doctor.id },
      },
      order: {
        dayOfWeek: 'ASC',
        startTime: 'ASC',
      },
    });
  }

  // Update recurring availability
  async updateRecurring(
    id: number,
    dto: UpdateRecurringDto,
  ) {
    const availability = await this.recurringRepo.findOne({
      where: { id },
    });

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }
    if (dto.startTime && dto.endTime) {
      this.validateTimeRange(dto.startTime, dto.endTime);
    }

    Object.assign(availability, dto);

    return this.recurringRepo.save(availability);
  }

  // Delete recurring availability
  async deleteRecurring(id: number) {
    const availability = await this.recurringRepo.findOne({
      where: { id },
    });

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    await this.recurringRepo.remove(availability);

    return {
      message: 'Availability deleted successfully',
    };
  }

  // Create custom override (additional availability for specific date)

  async createOverride(userId: number, dto: CreateOverrideDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    this.validateTimeRange(dto.startTime, dto.endTime);
    const duplicate = await this.customRepo.findOne({
      where: {
        doctor: { id: doctor.id },
        date: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });

    if (duplicate) {
      throw new ConflictException('Duplicate custom availability');
    }

    const availability = this.customRepo.create({
      ...dto,
      doctor,
    });

    return this.customRepo.save(availability);
  }
  private validateTimeRange(startTime: string, endTime: string) {
    if (startTime >= endTime) {
      throw new BadRequestException(
        'End time must be greater than start time',
      );
    }
  }

  private isOverlapping(
    start1: string,
    end1: string,
    start2: string,
    end2: string,
  ): boolean {
    return start1 < end2 && start2 < end1;
  }
  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
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

  // Get override by date
  async getByDate(userId: number, date: string) {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const override = await this.customRepo.find({
      where: {
        doctor: { id: doctor.id },
        date,
      },
    });

    if (override.length > 0) {
      return {
        source: 'CUSTOM_OVERRIDE',
        availability: override,
      };
    }


    const dayOfWeek = new Date(date)
      .toLocaleDateString('en-US', {
        weekday: 'long',
      })
      .toUpperCase();

    const recurring = await this.recurringRepo.find({
      where: {
        doctor: { id: doctor.id },
        dayOfWeek: dayOfWeek,
      },
    });

    return {
      source: 'RECURRING',
      availability: recurring,
    };

  }

  async generateSlots(id: number) {
    const availability = await this.recurringRepo.findOne({
      where: { id },
    });

    if (!availability) {
      throw new NotFoundException(
        'Availability not found',
      );
    }



    const slots: { startTime: string; endTime: string }[] = [];

    let current = this.toMinutes(
      availability.startTime,
    );

    const end = this.toMinutes(
      availability.endTime,
    );

    while (
      current +
      (availability.slotDuration ?? 0) <=
      end
    ) {
      const slotStart = current;

      const slotEnd =
        current +
        (availability.slotDuration ?? 0);

      slots.push({
        startTime: this.toTime(slotStart),
        endTime: this.toTime(slotEnd),
      });

      current =
        slotEnd +
        (availability.bufferTime ?? 0);
    }

    return {
      schedulingType: availability.schedulingType,
      totalSlots: slots.length,
      slots,
    };
  }
  async getAvailableSlots(doctorId: number, date: string) {
    const doctor = await this.doctorRepo.findOne({
      where: {
        id: doctorId,
      },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }
    // Delegate to scheduling engine
    const schedule = await computeDailySchedule(doctorId, date, this.recurringRepo, this.customRepo, this.appointmentRepo);
    if (!schedule) throw new BadRequestException('Doctor is unavailable on this day');

    return {
      doctorId,
      date: schedule.date,
      schedulingType: 'MIXED',
      totalSlots: schedule.totalAvailableSlots,
      slots: schedule.availableSlots,
    };
  }

  async expandAvailability(
    userId: number,
    dto: ExpandAvailabilityDto,
  ) {
    const doctor = await this.doctorRepo.findOne({
      where: {
        user: { id: userId },
      },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    const dayOfWeek = new Date(dto.date)
      .toLocaleDateString('en-US', {
        weekday: 'long',
      })
      .toUpperCase();

    const recurring = await this.recurringRepo.findOne({
      where: {
        doctor: { id: doctor.id },
        dayOfWeek,
      },
    });

    if (!recurring) {
      throw new BadRequestException('Recurring availability not found for this day');
    }

    if (dto.newEndTime <= recurring.endTime) {
      throw new BadRequestException('New end time must be greater than current end time');
    }

    // Check if custom availability already exists for this expansion
    const duplicate = await this.customRepo.findOne({
      where: {
        doctor: { id: doctor.id },
        date: dto.date,
        startTime: recurring.endTime,
        endTime: dto.newEndTime,
      },
    });

    if (duplicate) {
      throw new ConflictException('Availability already expanded for this time slot');
    }

    // Create custom availability for the expanded time
    const customAvailability = this.customRepo.create({
      doctor,
      date: dto.date,
      startTime: recurring.endTime,
      endTime: dto.newEndTime,
      schedulingType: recurring.schedulingType,
      slotDuration: recurring.slotDuration,
      bufferTime: recurring.bufferTime,
      maxPatients: recurring.maxPatients,
    });

    await this.customRepo.save(customAvailability);

    // Compute updated schedule
    const schedule = await computeDailySchedule(
      doctor.id,
      dto.date,
      this.recurringRepo,
      this.customRepo,
      this.appointmentRepo,
    );

    return {
      message: 'Availability expanded successfully',
      date: dto.date,
      previousEndTime: recurring.endTime,
      newEndTime: dto.newEndTime,
      additionalSlots: schedule.totalAvailableSlots,
    };
  }
  async shrinkAvailability(userId: number, dto: ShrinkAvailabilityDto) {

    // 1. Find Doctor
    const doctor = await this.doctorRepo.findOne({
      where: {
        user: { id: userId }
      },
      relations: ['user']
    });

    if (!doctor) {
      throw new NotFoundException("Doctor not found");
    }

    // 2. Find recurring availability
    const dayOfWeek = new Date(dto.date)
      .toLocaleDateString('en-US', {
        weekday: 'long'
      })
      .toUpperCase();

    const recurring =
      await this.recurringRepo.findOne({
        where: {
          doctor: { id: doctor.id },
          dayOfWeek
        }
      });

    if (!recurring) {
      throw new NotFoundException("Recurring availability not found");
    }

    // 3. Validate shrink
    if (dto.newEndTime >= recurring.endTime) {
      throw new BadRequestException(
        "New end time must be smaller than current end time"
      );
    }

    // 4. Generate schedule
    const schedule =
      await computeDailySchedule(
        doctor.id,
        dto.date,
        this.recurringRepo,
        this.customRepo,
        this.appointmentRepo
      );

    // 5. Find affected slots
   const affectedSlots = schedule.availableSlots.filter(
  slot =>
    this.toMinutes(slot.startTime) >=
    this.toMinutes(dto.newEndTime),
);

    // 6. Find booked appointments
    const bookedAppointments =
      await this.appointmentRepo.find({

        where: {
          doctor: { id: doctor.id },
          date: dto.date,
          status: AppointmentStatus.BOOKED
        },

        relations: [
  'patient',
  'patient.user',
  'doctor',
]

      });
    const affectedAppointments = bookedAppointments.filter(
  appt =>
    this.toMinutes(appt.endTime) >
    this.toMinutes(dto.newEndTime),
);

    // 7. Suggest nearest slot
   const suggestions: Array<{
  appointmentId: number;
  patient: string;
  oldSlot: {
    start: string;
    end: string;
  };
  suggestedSlot: any;
}> = [];

for (const appt of affectedAppointments) {

  const alternative = await findShrinkAlternatives(
    doctor.id,
    dto.date,
    dto.newEndTime,
    recurring.id,
    this.recurringRepo,
    this.customRepo,
    this.appointmentRepo,
  );

  suggestions.push({
    appointmentId: appt.id,
    patient: appt.patient.fullName,

    oldSlot: {
      start: appt.startTime,
      end: appt.endTime,
    },

    suggestedSlot: alternative,
  });

  if (appt.patient?.user?.email) {
    await this.notificationService.sendShrinkEmail({
      patientEmail: appt.patient.user.email,
      patientName: appt.patient.fullName,
      doctorName: doctor.fullName,

      oldDate: dto.date,
      oldStartTime: appt.startTime,
      oldEndTime: appt.endTime,

      suggestedDate: alternative?.date ?? null,
      suggestedStartTime: alternative?.startTime ?? null,
      suggestedEndTime: alternative?.endTime ?? null,
    });
  }
}
// 8. Persist the shrink
const previousEndTime = recurring.endTime;

recurring.endTime = dto.newEndTime;

await this.recurringRepo.save(recurring);
return {
  message: 'Availability shrink processed successfully',

  date: dto.date,

 previousEndTime: previousEndTime,
newEndTime: recurring.endTime,

  schedulingType: recurring.schedulingType,

  maxPatients: recurring.maxPatients,

  affectedSlots: affectedSlots.length,

  affectedAppointments: affectedAppointments.length,

  suggestions,

  emailNotificationsSent: affectedAppointments.filter(
    appt => !!appt.patient?.user?.email
  ).length,
};
  }




  // recurring availability
}