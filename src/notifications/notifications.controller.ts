// Provides CRUD endpoints for notifications using the generated Notifications entity.
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
import { Notifications } from './notifications.entity';
import { NotificationsRepository } from './notifications.repository';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly repository: NotificationsRepository) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { notificationId: id },
    });

    if (!entity) {
      throw new NotFoundException('Notifications record not found');
    }

    return entity;
  }

  @Roles('admin', 'coordinator')
  @Post()
  create(@Body() payload: DeepPartial<Notifications>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<Notifications>) {
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
