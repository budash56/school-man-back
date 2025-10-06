// Provides CRUD endpoints for timetable-slots using the generated TimetableSlots entity.
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DeepPartial } from 'typeorm';
import { TimetableSlots } from './timetable_slots.entity';

@Controller('timetable-slots')
export class TimetableSlotsController {
  constructor(
    @InjectRepository(TimetableSlots)
    private readonly repository: Repository<TimetableSlots>,
  ) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { slotId: id },
    });

    if (!entity) {
      throw new NotFoundException('TimetableSlots record not found');
    }

    return entity;
  }

  @Post()
  create(@Body() payload: DeepPartial<TimetableSlots>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<TimetableSlots>) {
    const entity = await this.findOne(id);
    this.repository.merge(entity, payload);
    return this.repository.save(entity);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { deleted: true };
  }
}
