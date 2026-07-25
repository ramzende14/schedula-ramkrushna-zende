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

import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { CreateOverrideDto } from './dto/create-override.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(RecurringAvailability)
    private recurringRepo: Repository<RecurringAvailability>,

    @InjectRepository(CustomAvailability)
    private customRepo: Repository<CustomAvailability>,

    @InjectRepository(DoctorProfile)
    private doctorRepo: Repository<DoctorProfile>,
  ) {}

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
    // STREAM validation
if (dto.schedulingType === SchedulingType.STREAM) {
  if (!dto.slotDuration) {
    throw new BadRequestException(
      'Slot duration is required for STREAM scheduling',
    );
  }

  if (dto.slotDuration < 5) {
    throw new BadRequestException(
      'Slot duration must be at least 5 minutes',
    );
  }

  if (dto.bufferTime && dto.bufferTime < 0) {
    throw new BadRequestException(
      'Buffer time cannot be negative',
    );
  }
}

// WAVE validation
if (dto.schedulingType === SchedulingType.WAVE) {
  if (!dto.maxPatients) {
    throw new BadRequestException(
      'Maximum patient capacity is required for WAVE scheduling',
    );
  }

  if (dto.maxPatients < 1) {
    throw new BadRequestException(
      'Maximum patient capacity must be greater than 0',
    );
  }
}

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

  // Create custom override
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
  throw new ConflictException(
    'Duplicate custom availability',
  );
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
    dayOfWeek: dayOfWeek as any,
  },
});

return {
  source: 'RECURRING',
  availability: recurring,
};

  }

async generateStreamSlots(id: number) {
  const availability = await this.recurringRepo.findOne({
    where: { id },
  });

  if (!availability) {
    throw new NotFoundException(
      'Availability not found',
    );
  }

  if (
    availability.schedulingType !==
    SchedulingType.STREAM
  ) {
    throw new BadRequestException(
      'This is not a STREAM schedule',
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
    schedulingType: "STREAM",
    totalSlots: slots.length,
    slots,
  };
}
async getWaveAvailability(id: number) {
  const availability = await this.recurringRepo.findOne({
    where: { id },
  });

  if (!availability) {
    throw new NotFoundException('Availability not found');
  }

  if (availability.schedulingType !== SchedulingType.WAVE) {
    throw new BadRequestException(
      'This is not a WAVE schedule',
    );
  }

  return {
    schedulingType: 'WAVE',
    timeWindow: `${availability.startTime} - ${availability.endTime}`,
    available: `${availability.currentPatients}/${availability.maxPatients}`,
    remaining:
      (availability.maxPatients ?? 0) -
      availability.currentPatients,
  };
}async bookWave(id: number) {
  const availability = await this.recurringRepo.findOne({
    where: { id },
  });

  if (!availability) {
    throw new NotFoundException(
      'Availability not found',
    );
  }

  if (
    availability.schedulingType !==
    SchedulingType.WAVE
  ) {
    throw new BadRequestException(
      'This is not a WAVE schedule',
    );
  }

  if (
    availability.currentPatients >=
    (availability.maxPatients ?? 0)
  ) {
    throw new ConflictException('Wave is full');
  }

  availability.currentPatients++;

  await this.recurringRepo.save(availability);

  return {
    message: 'Appointment booked successfully',
    tokenNumber: availability.currentPatients,
    appointmentWindow: `${availability.startTime} - ${availability.endTime}`,
  };
}

// recurring availability
}