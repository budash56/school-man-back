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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DeepPartial } from 'typeorm';
import { DisciplinaryRecords } from './disciplinary_records.entity';

@Controller('disciplinary-records')
export class DisciplinaryRecordsController {
  constructor(
    @InjectRepository(DisciplinaryRecords)
    private readonly repository: Repository<DisciplinaryRecords>,
  ) {}

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

  @Post()
  create(@Body() payload: DeepPartial<DisciplinaryRecords>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<DisciplinaryRecords>) {
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
