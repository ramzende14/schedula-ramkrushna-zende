import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AvailabilityService } from './availability.service';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../common/decorator/roles.decorator';
import { UserRole } from '../user/user.entity';

import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { CreateOverrideDto } from './dto/create-override.dto';

@Controller('doctor/availability')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DOCTOR)
export class AvailabilityController {
  constructor(
    private readonly availabilityService: AvailabilityService,
  ) {}

  // Create recurring availability
  @Post()
  createRecurring(
    @Req() req,
    @Body() dto: CreateRecurringDto,
  ) {
    return this.availabilityService.createRecurring(
      req.user.userId,
      dto,
    );
  }

  // Get recurring availability
  @Get()
  getRecurring(@Req() req) {
    return this.availabilityService.getRecurring(
      req.user.userId,
    );
  }

  // Update recurring availability
  @Patch(':id')
  updateRecurring(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecurringDto,
  ) {
    return this.availabilityService.updateRecurring(
      id,
      dto,
    );
  }

  // Delete recurring availability
  @Delete(':id')
  deleteRecurring(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.availabilityService.deleteRecurring(id);
  }

  // Create custom override
  @Post('override')
  createOverride(
    @Req() req,
    @Body() dto: CreateOverrideDto,
  ) {
    return this.availabilityService.createOverride(
      req.user.userId,
      dto,
    );
  }

  // Get availability by date
  @Get('date')
  getAvailabilityByDate(
    @Req() req,
    @Query('date') date: string,
  ) {
    return this.availabilityService.getByDate(
      req.user.userId,
      date,
    );
  }
}