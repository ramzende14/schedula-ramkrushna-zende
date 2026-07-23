import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DoctorController } from './doctor.controller';
import { DoctorService } from './doctor.service';
import { DoctorProfile } from './entity/doctor-profile.entity';
import { User } from '../user/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DoctorProfile, User])],
  controllers: [DoctorController],
  providers: [DoctorService],
})
export class DoctorModule {}