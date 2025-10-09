// Provides CRUD endpoints for users using the generated Users entity.
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
import { Users } from './users.entity';
import { UsersRepository } from './users.repository';

@Controller('users')
export class UsersController {
  constructor(private readonly repository: UsersRepository) {}

  @Get()
  findAll() {
    return this.repository.find();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const entity = await this.repository.findOne({
      where: { nationalId: id },
    });

    if (!entity) {
      throw new NotFoundException('Users record not found');
    }

    return entity;
  }

  @Post()
  create(@Body() payload: DeepPartial<Users>) {
    const entity = this.repository.create(payload);
    return this.repository.save(entity);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() payload: DeepPartial<Users>) {
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
