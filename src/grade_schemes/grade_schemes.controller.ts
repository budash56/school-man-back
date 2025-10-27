import { ApiBearerAuth } from '@nestjs/swagger';
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
import type { DeepPartial } from 'typeorm';
import { GradeSchemes } from './grade_schemes.entity';
import { GradeSchemesRepository } from './grade_schemes.repository';
import { READ_ROLES, Roles, WRITE_ROLES } from '../auth/roles.decorator';

@Roles(...READ_ROLES)
@ApiBearerAuth()
@Controller('grade-schemes')
export class GradeSchemesController {
  constructor(private readonly repository: GradeSchemesRepository) {}

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

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() payload: DeepPartial<GradeSchemes>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<GradeSchemes>) {
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
