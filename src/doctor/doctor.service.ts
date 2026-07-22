import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { DoctorProfile } from './entity/doctor-profile.entity';
import { User } from '../user/user.entity';
import { CreateDoctorProfileDto } from './dto/create-doctor-profile.dto';
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(DoctorProfile)
    private readonly doctorRepository: Repository<DoctorProfile>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createProfile(
    userId: number,
    dto: CreateDoctorProfileDto,
  ) {
    const existingProfile = await this.doctorRepository.findOne({
      where: {
        user: {
          id: userId,
        },
      },
      relations: ['user'],
    });

    if (existingProfile) {
      throw new ConflictException('Doctor profile already exists');
    }

    const user = await this.userRepository.findOne({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const doctorProfile = this.doctorRepository.create({
      ...dto,
      user,
    });

    await this.doctorRepository.save(doctorProfile);

    const { password, ...userWithoutPassword } = doctorProfile.user;

    return {
      message: 'Doctor profile created successfully',
      data: {
        ...doctorProfile,
        user: userWithoutPassword,
      },
    };
  }

  async getProfile(userId: number) {
    const doctorProfile = await this.doctorRepository.findOne({
      where: {
        user: {
          id: userId,
        },
      },
      relations: ['user'],
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }

    const { password, ...userWithoutPassword } = doctorProfile.user;

    return {
      message: 'Doctor profile fetched successfully',
      data: {
        ...doctorProfile,
        user: userWithoutPassword,
      },
    };
  }

  async updateProfile(
    userId: number,
    dto: UpdateDoctorProfileDto,
  ) {
    const doctorProfile = await this.doctorRepository.findOne({
      where: {
        user: {
          id: userId,
        },
      },
      relations: ['user'],
    });

    if (!doctorProfile) {
      throw new NotFoundException('Doctor profile not found');
    }

    doctorProfile.fullName =
      dto.fullName ?? doctorProfile.fullName;

    doctorProfile.specialization =
      dto.specialization ?? doctorProfile.specialization;

    doctorProfile.experience =
      dto.experience ?? doctorProfile.experience;

    doctorProfile.qualification =
      dto.qualification ?? doctorProfile.qualification;

    doctorProfile.consultationFee =
      dto.consultationFee ?? doctorProfile.consultationFee;

    doctorProfile.availability =
      dto.availability ?? doctorProfile.availability;

    doctorProfile.profileDetails =
      dto.profileDetails ?? doctorProfile.profileDetails;

    await this.doctorRepository.save(doctorProfile);

    const { password, ...userWithoutPassword } = doctorProfile.user;

    return {
      message: 'Doctor profile updated successfully',
      data: {
        ...doctorProfile,
        user: userWithoutPassword,
      },
    };
  }
}