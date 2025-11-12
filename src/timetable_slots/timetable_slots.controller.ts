import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Body, Controller, Delete, Get, Param, Patch, Post, ParseIntPipe, UseGuards } from '@nestjs/common';
import { READ_ROLES, Roles, WRITE_ROLES } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';
import { TimetableSlotsService } from './timetable_slots.service';

@ApiTags('timetable-slots')
@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('timetable-slots')
export class TimetableSlotsController {
  constructor(private readonly service: TimetableSlotsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Roles(...WRITE_ROLES)
  @Post()
  @ApiBody({
    type: CreateTimetableSlotDto,
    examples: {
      default: {
        summary: 'Create slot',
        value: {
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '09:00',
          durationMinutes: 60,
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  async create(@Body() payload: CreateTimetableSlotDto) {
    return this.service.create(payload);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id')
  @ApiBody({
    type: UpdateTimetableSlotDto,
    examples: {
      default: {
        summary: 'Update slot time',
        value: { startTime: '09:00', endTime: '10:00' },
      },
    },
  })
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateTimetableSlotDto,
  ) {
    return this.service.update(id, payload);
  }

  @Roles(...WRITE_ROLES)
  @Delete(':id')
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
