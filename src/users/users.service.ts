import { Injectable, NotFoundException } from '@nestjs/common';
import { Brackets } from 'typeorm';
import { UsersRepository } from './users.repository';
import { Users } from './users.entity';
import { CreateUsersDto } from './dto/create-users.dto';
import { UpdateUsersDto } from './dto/update-users.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import {
  buildPaginationResult,
  PaginatedResult,
  resolvePagination,
} from '../shared/pagination';
import { DbErrorMapper } from '../shared/db-error.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  async findAll(query: QueryUsersDto): Promise<PaginatedResult<Users>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);
    const qb = this.repository.createQueryBuilder('users');

    if (query.isActive !== undefined) {
      qb.andWhere('users.is_active = :isActive', { isActive: query.isActive });
    }

    if (query.role) {
      qb.andWhere('users.role = :role', { role: query.role });
    }

    if (query.q?.trim()) {
      const keyword = this.buildSearchKeyword(query.q);
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where("users.username ILIKE :keyword ESCAPE \\'")
            .orWhere("users.national_id ILIKE :keyword ESCAPE \\'")
            .orWhere("users.first_name ILIKE :keyword ESCAPE \\'")
            .orWhere("users.last_name ILIKE :keyword ESCAPE \\'");
        }),
      ).setParameter('keyword', keyword);
    }

    qb.orderBy('users.created_at', 'DESC');
    qb.skip((page - 1) * pageSize);
    qb.take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return buildPaginationResult(data, total, page, pageSize);
  }

  async findOne(id: string): Promise<Users> {
    const entity = await this.repository.findOne({
      where: { nationalId: id },
    });

    if (!entity) {
      throw new NotFoundException('Users record not found');
    }

    return entity;
  }

  async create(dto: CreateUsersDto): Promise<Users> {
    const entity = this.repository.create({
      nationalId: dto.nationalId,
      username: dto.username,
      passwordHash: dto.passwordHash,
      role: dto.role,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      isActive: dto.isActive ?? true,
    });

    try {
      return await this.repository.save(entity);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'User with this national ID or username already exists',
      );
    }
  }

  async update(id: string, dto: UpdateUsersDto): Promise<Users> {
    const entity = await this.getEntity(id);

    if (dto.nationalId !== undefined) {
      entity.nationalId = dto.nationalId;
    }

    if (dto.username !== undefined) {
      entity.username = dto.username;
    }

    if (dto.passwordHash !== undefined) {
      entity.passwordHash = dto.passwordHash;
    }

    if (dto.role !== undefined) {
      entity.role = dto.role;
    }

    if (dto.firstName !== undefined) {
      entity.firstName = dto.firstName ?? null;
    }

    if (dto.lastName !== undefined) {
      entity.lastName = dto.lastName ?? null;
    }

    if (dto.email !== undefined) {
      entity.email = dto.email ?? null;
    }

    if (dto.phone !== undefined) {
      entity.phone = dto.phone ?? null;
    }

    if (dto.isActive !== undefined) {
      entity.isActive = dto.isActive;
    }

    try {
      return await this.repository.save(entity);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'User with this national ID or username already exists',
      );
    }
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const entity = await this.getEntity(id);
    await this.repository.remove(entity);
    return { deleted: true };
  }

  private async getEntity(id: string): Promise<Users> {
    const entity = await this.repository.findOne({
      where: { nationalId: id },
    });

    if (!entity) {
      throw new NotFoundException('Users record not found');
    }

    return entity;
  }

  private buildSearchKeyword(raw: string): string {
    const trimmed = raw.trim();

    if (!trimmed) {
      return '%%';
    }

    const escaped = trimmed.replace(/[%_]/g, (match) => `\\${match}`);
    return `%${escaped}%`;
  }
}
