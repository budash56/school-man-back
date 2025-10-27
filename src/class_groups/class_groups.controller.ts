// Provides CRUD endpoints for class-groups using the generated ClassGroups entity.
import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import type { DeepPartial } from 'typeorm';
import { ClassGroups } from './class_groups.entity';
import { ClassGroupsRepository } from './class_groups.repository';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('class-groups')
export class ClassGroupsController {
  constructor(private readonly repository: ClassGroupsRepository) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { classGroupId: id },
    });

    if (!entity) {
      throw new NotFoundException('ClassGroups record not found');
    }

    return entity;
  }

  @Roles('admin', 'coordinator')
  @Post()
  create(@Body() payload: DeepPartial<ClassGroups>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<ClassGroups>) {
    const entity = await this.findOne(id);
    this.repository.merge(entity, payload);
    return this.repository.save(entity);
  }

  @Roles('admin', 'coordinator')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
    return { deleted: true };
  }
}
