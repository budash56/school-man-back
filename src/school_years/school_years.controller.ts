// Provides CRUD endpoints for school-years using the generated SchoolYears entity.
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
import { SchoolYears } from './school_years.entity';

@Controller('school-years')
export class SchoolYearsController {
  constructor(
    @InjectRepository(SchoolYears)
    private readonly repository: Repository<SchoolYears>,
  ) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { schoolYearId: id },
    });

    if (!entity) {
      throw new NotFoundException('SchoolYears record not found');
    }

    return entity;
  }

  @Post()
  create(@Body() payload: DeepPartial<SchoolYears>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<SchoolYears>) {
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
