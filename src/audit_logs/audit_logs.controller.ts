// Provides CRUD endpoints for audit-logs using the generated AuditLogs entity.
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
import { AuditLogs } from './audit_logs.entity';
import { AuditLogsRepository } from './audit_logs.repository';
import { READ_ROLES, Roles } from '../auth/roles.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Roles(...READ_ROLES)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly repository: AuditLogsRepository) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { auditId: id },
    });

    if (!entity) {
      throw new NotFoundException('AuditLogs record not found');
    }

    return entity;
  }

  @Roles('admin', 'coordinator')
  @Post()
  create(@Body() payload: DeepPartial<AuditLogs>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Roles('admin', 'coordinator')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<AuditLogs>) {
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
