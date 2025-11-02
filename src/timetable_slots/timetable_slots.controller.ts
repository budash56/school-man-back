import { ApiBearerAuth, ApiForbiddenResponse } from '@nestjs/swagger';
// src/timetable_slots/timetable_slots.controller.ts
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
  BadRequestException,
} from '@nestjs/common';
import type { DeepPartial } from 'typeorm';
import { TimetableSlot } from './timetable_slots.entity';
import { TimetableSlotRepository } from './timetable_slots.repository';
import { READ_ROLES, Roles, WRITE_ROLES } from '../auth/roles.decorator';

@Roles(...READ_ROLES)
@ApiBearerAuth()
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
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  async create(@Body() payload: DeepPartial<TimetableSlot>) {
    // optional guard: prevent client from sending slotId
    if ('slotId' in payload!) {
      throw new BadRequestException('slotId is auto-generated');
    }
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id')
  @ApiForbiddenResponse({
    description: `Forbidden: requires role ${WRITE_ROLES.join(', ')}`,
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: DeepPartial<TimetableSlot>, // <-- fixed plural
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
