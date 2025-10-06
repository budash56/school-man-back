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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DeepPartial } from 'typeorm';
import { AuditLogs } from './audit_logs.entity';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(
    @InjectRepository(AuditLogs)
    private readonly repository: Repository<AuditLogs>,
  ) {}

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
