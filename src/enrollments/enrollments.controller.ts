// Provides CRUD endpoints for enrollments using the generated Enrollments entity.
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
import { Enrollments } from './enrollments.entity';
import { EnrollmentsRepository } from './enrollments.repository';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly repository: EnrollmentsRepository) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { enrollmentId: id },
    });

    if (!entity) {
      throw new NotFoundException('Enrollments record not found');
    }

    return entity;
  }

  @Post()
  create(@Body() payload: DeepPartial<Enrollments>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<Enrollments>) {
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
