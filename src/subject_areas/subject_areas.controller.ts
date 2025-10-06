// Provides CRUD endpoints for subject-areas using the generated SubjectAreas entity.
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
import { SubjectAreas } from './subject_areas.entity';

@Controller('subject-areas')
export class SubjectAreasController {
  constructor(
    @InjectRepository(SubjectAreas)
    private readonly repository: Repository<SubjectAreas>,
  ) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { areaId: id },
    });

    if (!entity) {
      throw new NotFoundException('SubjectAreas record not found');
    }

    return entity;
  }

  @Post()
  create(@Body() payload: DeepPartial<SubjectAreas>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<SubjectAreas>) {
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
