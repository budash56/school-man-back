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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DeepPartial } from 'typeorm';
import { CourseInstances } from './course_instances.entity';

@Controller('course-instances')
export class CourseInstancesController {
  constructor(
    @InjectRepository(CourseInstances)
    private readonly repository: Repository<CourseInstances>,
  ) {}

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
