// Provides CRUD endpoints for classrooms using the generated Classrooms entity.
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
import { Classrooms } from './classrooms.entity';
import { ClassroomsRepository } from './classrooms.repository';
import { READ_ROLES, Roles, WRITE_ROLES } from '../auth/roles.decorator';

@Roles(...READ_ROLES)
@Controller('classrooms')
export class ClassroomsController {
  constructor(private readonly repository: ClassroomsRepository) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { classroomId: id },
    });

    if (!entity) {
      throw new NotFoundException('Classrooms record not found');
    }

    return entity;
  }

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() payload: DeepPartial<Classrooms>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<Classrooms>) {
    const entity = await this.findOne(id);
    this.repository.merge(entity, payload);
    return this.repository.save(entity);
  }

  @Roles(...WRITE_ROLES)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { deleted: true };
  }
}
