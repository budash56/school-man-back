// Provides CRUD endpoints for course-instances using the generated CourseInstances entity.
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
import { CourseInstances } from './course_instances.entity';
import { CourseInstancesRepository } from './course_instances.repository';

@Controller('course-instances')
export class CourseInstancesController {
  constructor(private readonly repository: CourseInstancesRepository) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { courseInstanceId: id },
    });

    if (!entity) {
      throw new NotFoundException('CourseInstances record not found');
    }

    return entity;
  }

  @Post()
  create(@Body() payload: DeepPartial<CourseInstances>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<CourseInstances>) {
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
