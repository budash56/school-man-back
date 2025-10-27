// Provides CRUD endpoints for disciplinary-records using the generated DisciplinaryRecords entity.
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
import { DisciplinaryRecords } from './disciplinary_records.entity';
import { DisciplinaryRecordsRepository } from './disciplinary_records.repository';
import { READ_ROLES, Roles, WRITE_ROLES } from '../auth/roles.decorator';

@Roles(...READ_ROLES)
@Controller('disciplinary-records')
export class DisciplinaryRecordsController {
  constructor(private readonly repository: DisciplinaryRecordsRepository) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { disciplinaryId: id },
    });

    if (!entity) {
      throw new NotFoundException('DisciplinaryRecords record not found');
    }

    return entity;
  }

  @Roles(...WRITE_ROLES)
  @Post()
  create(@Body() payload: DeepPartial<DisciplinaryRecords>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Roles(...WRITE_ROLES)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<DisciplinaryRecords>) {
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
