// Provides CRUD endpoints for attendance using the generated Attendance entity.
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
import type { DeepPartial } from 'typeorm';
import { Attendance } from './attendance.entity';
import { AttendanceRepository } from './attendance.repository';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly repository: AttendanceRepository) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { attendanceId: id },
    });

    if (!entity) {
      throw new NotFoundException('Attendance record not found');
    }

    return entity;
  }

  @Post()
  create(@Body() payload: DeepPartial<Attendance>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<Attendance>) {
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
