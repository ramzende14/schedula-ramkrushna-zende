import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PatientProfile } from './entity/patient-profile.entity';
import { User } from '../user/user.entity';

import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(PatientProfile)
    private readonly patientRepository: Repository<PatientProfile>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createProfile(
    userId: number,
    dto: CreatePatientProfileDto,
  ) {
    const existingProfile = await this.patientRepository.findOne({
      where: {
        user: {
          id: userId,
        },
      },
      relations: ['user'],
    });

    if (existingProfile) {
      throw new ConflictException('Patient profile already exists');
    }

    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const patientProfile = this.patientRepository.create({
      ...dto,
      user,
    });

    await this.patientRepository.save(patientProfile);

    const { password, ...userWithoutPassword } = patientProfile.user;

    return {
      message: 'Patient profile created successfully',
      data: {
        ...patientProfile,
        user: userWithoutPassword,
      },
    };
  }

  async getProfile(userId: number) {
    const patientProfile = await this.patientRepository.findOne({
      where: {
        user: {
          id: userId,
        },
      },
      relations: ['user'],
    });

    if (!patientProfile) {
      throw new NotFoundException('Patient profile not found');
    }

    const { password, ...userWithoutPassword } = patientProfile.user;

    return {
      message: 'Patient profile fetched successfully',
      data: {
        ...patientProfile,
        user: userWithoutPassword,
      },
    };
  }

  async updateProfile(
    userId: number,
    dto: UpdatePatientProfileDto,
  ) {
    const patientProfile = await this.patientRepository.findOne({
      where: {
        user: {
          id: userId,
        },
      },
      relations: ['user'],
    });

    if (!patientProfile) {
      throw new NotFoundException('Patient profile not found');
    }

    patientProfile.fullName =
      dto.fullName ?? patientProfile.fullName;

    patientProfile.age =
      dto.age ?? patientProfile.age;

    patientProfile.gender =
      dto.gender ?? patientProfile.gender;

    patientProfile.contactDetails =
      dto.contactDetails ?? patientProfile.contactDetails;

    patientProfile.healthInformation =
      dto.healthInformation ?? patientProfile.healthInformation;

    await this.patientRepository.save(patientProfile);

    const { password, ...userWithoutPassword } = patientProfile.user;

    return {
      message: 'Patient profile updated successfully',
      data: {
        ...patientProfile,
        user: userWithoutPassword,
      },
    };
  }
}