import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { TimetableSlot } from './timetable_slots.entity';
import { TimetableSlotRepository } from './timetable_slots.repository';
import { READ_ROLES, Roles, WRITE_ROLES } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CreateTimetableSlotDto } from './dto/create-timetable-slot.dto';
import { UpdateTimetableSlotDto } from './dto/update-timetable-slot.dto';

@ApiTags('timetable-slots')
@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('timetable-slots')
export class TimetableSlotsController {
  constructor(private readonly repository: TimetableSlotRepository) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const entity = await this.repository.findOne({
      where: { slotId: id },
    });
    if (!entity) {
      throw new NotFoundException('TimetableSlot not found');
    }
    return entity;
  }

  @Roles(...WRITE_ROLES)
  @Post()
  @ApiBody({
    type: CreateTimetableSlotDto,
    examples: {
      default: {
        summary: 'Create slot',
        value: { dayOfWeek: 1, startTime: '08:00', endTime: '09:00' },
      },
    },
  })
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  async create(@Body() payload: CreateTimetableSlotDto) {
    const entity = this.repository.create(payload as Partial<TimetableSlot>);
    return this.repository.save(entity);
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
    const entity = await this.findOne(id);
    this.repository.merge(entity, payload);
    return this.repository.save(entity);
  }

  @Roles(...WRITE_ROLES)
  @Delete(':id')
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  async remove(@Param('id', ParseIntPipe) id: number) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { deleted: true };
  }
}
