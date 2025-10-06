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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DeepPartial } from 'typeorm';
import { TimetableSlot } from './timetable_slots.entity';

@Controller('timetable-slots')
export class TimetableSlotsController {
  constructor(
    @InjectRepository(TimetableSlot)
    private readonly repository: Repository<TimetableSlot>,
  ) {}

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

  @Post()
  async create(@Body() payload: DeepPartial<TimetableSlot>) {
    // optional guard: prevent client from sending slotId
    if ('slotId' in payload!) {
      throw new BadRequestException('slotId is auto-generated');
    }
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: DeepPartial<TimetableSlot>, // <-- fixed plural
  ) {
    const entity = await this.findOne(id);
    this.repository.merge(entity, payload);
    return this.repository.save(entity);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { deleted: true };
  }
}
