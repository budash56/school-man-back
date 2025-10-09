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
} from '@nestjs/common';
import type { DeepPartial } from 'typeorm';
import { AuditLogs } from './audit_logs.entity';
import { AuditLogsRepository } from './audit_logs.repository';

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

  @Post()
  create(@Body() payload: DeepPartial<AuditLogs>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<AuditLogs>) {
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
