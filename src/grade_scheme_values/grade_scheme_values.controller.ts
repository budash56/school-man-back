import { ApiBearerAuth } from '@nestjs/swagger';
// Provides CRUD endpoints for grade-scheme-values using the generated GradeSchemeValues entity.
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
import { GradeSchemeValues } from './grade_scheme_values.entity';
import { GradeSchemeValuesRepository } from './grade_scheme_values.repository';
import { READ_ROLES, Roles, WRITE_ROLES } from '../auth/roles.decorator';

@Roles(...READ_ROLES)
@ApiBearerAuth()
@Controller('grade-scheme-values')
export class GradeSchemeValuesController {
  constructor(private readonly repository: GradeSchemeValuesRepository) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { valueId: id },
    });

    if (!entity) {
      throw new NotFoundException('GradeSchemeValues record not found');
    }

    return entity;
  }

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() payload: DeepPartial<GradeSchemeValues>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<GradeSchemeValues>) {
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
