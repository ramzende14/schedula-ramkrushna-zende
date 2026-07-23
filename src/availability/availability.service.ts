import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RecurringAvailability } from './entity/recurring-availability.entity';
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

    const availability = this.recurringRepo.create({
      ...dto,
      doctor,
    });

    return this.recurringRepo.save(availability);
  }

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

// recurring availability
  }
}