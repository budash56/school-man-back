// Provides CRUD endpoints for subjects using the generated Subjects entity.
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
import { Subjects } from './subjects.entity';

@Controller('subjects')
export class SubjectsController {
  constructor(
    @InjectRepository(Subjects)
    private readonly repository: Repository<Subjects>,
  ) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { subjectId: id },
    });

    if (!entity) {
      throw new NotFoundException('Subjects record not found');
    }

    return entity;
  }

  @Post()
  create(@Body() payload: DeepPartial<Subjects>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<Subjects>) {
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
