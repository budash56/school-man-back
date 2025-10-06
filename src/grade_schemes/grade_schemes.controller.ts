// Provides CRUD endpoints for grade-schemes using the generated GradeSchemes entity.
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
import { GradeSchemes } from './grade_schemes.entity';

@Controller('grade-schemes')
export class GradeSchemesController {
  constructor(
    @InjectRepository(GradeSchemes)
    private readonly repository: Repository<GradeSchemes>,
  ) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { schemeId: id },
    });

    if (!entity) {
      throw new NotFoundException('GradeSchemes record not found');
    }

    return entity;
  }

  @Post()
  create(@Body() payload: DeepPartial<GradeSchemes>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<GradeSchemes>) {
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
