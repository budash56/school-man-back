import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Brackets, In } from 'typeorm';
import * as XLSX from 'xlsx';
import { randomBytes } from 'crypto';
import { isEmail } from 'class-validator';
import type { Express } from 'express';
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
    const providedPasswordHash = dto.passwordHash?.trim();
    const usesTempPassword = !providedPasswordHash;
    const passwordHash = providedPasswordHash
      ? providedPasswordHash
      : await this.buildTempPasswordHash(dto);
    const entity = this.repository.create({
      nationalId: dto.nationalId,
      username: dto.username,
      passwordHash,
      role: dto.role,
      firstName: dto.firstName ?? null,
      lastName: dto.lastName ?? null,
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      isActive: dto.isActive ?? true,
      mustChangePassword: usesTempPassword,
      tempPasswordIssuedAt: usesTempPassword ? new Date() : null,
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

  async bulkImport(file: Express.Multer.File): Promise<{
    total: number;
    created: number;
    skipped: number;
    errors: { row: number; message: string }[];
    credentials: { nationalId: string; username: string; tempPassword: string }[];
  }> {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (!extension || !['csv', 'xlsx', 'xls'].includes(extension)) {
      throw new BadRequestException('File must be CSV or Excel (.xlsx, .xls).');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('File contains no sheets.');
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    });

    if (rawRows.length === 0) {
      throw new BadRequestException('File is empty.');
    }

    const parsedRows: Array<{
      rowNumber: number;
      nationalId: string;
      firstName: string;
      lastName: string;
      email: string;
      username?: string;
      phone?: string;
    }> = [];
    const errors: { row: number; message: string }[] = [];

    rawRows.forEach((raw, index) => {
      const rowNumber = index + 2;
      const mapped = this.mapBulkRow(raw);
      const nationalId = mapped.nationalId.trim();
      const firstName = mapped.firstName.trim();
      const lastName = mapped.lastName.trim();
      const email = mapped.email.trim().toLowerCase();

      if (!nationalId || !firstName || !lastName || !email) {
        errors.push({
          row: rowNumber,
          message: 'Faltan datos requeridos (documento, nombres, apellidos, correo).',
        });
        return;
      }

      if (!isEmail(email)) {
        errors.push({
          row: rowNumber,
          message: 'Correo inválido.',
        });
        return;
      }

      parsedRows.push({
        rowNumber,
        nationalId,
        firstName,
        lastName,
        email,
        username: mapped.username?.trim(),
        phone: mapped.phone?.trim(),
      });
    });

    if (parsedRows.length === 0) {
      return {
        total: rawRows.length,
        created: 0,
        skipped: 0,
        errors,
        credentials: [],
      };
    }

    const nationalIds = parsedRows.map((row) => row.nationalId);
    const usernames = parsedRows
      .map((row) => this.normalizeUsername(row.username))
      .filter((value): value is string => Boolean(value));

    const existingUsers = await this.repository.find({
      where: [
        ...(nationalIds.length > 0 ? [{ nationalId: In(nationalIds) }] : []),
        ...(usernames.length > 0 ? [{ username: In(usernames) }] : []),
      ],
    });

    const existingNationalIds = new Set(
      existingUsers.map((user) => user.nationalId),
    );
    const existingUsernames = new Set(
      existingUsers.map((user) => user.username),
    );
    const usedUsernames = new Set(existingUsernames);
    const createdCredentials: {
      nationalId: string;
      username: string;
      tempPassword: string;
    }[] = [];

    let created = 0;
    let skipped = 0;

    for (const row of parsedRows) {
      if (existingNationalIds.has(row.nationalId)) {
        skipped += 1;
        errors.push({
          row: row.rowNumber,
          message: 'Documento ya existe en el sistema.',
        });
        continue;
      }

      const baseUsername =
        this.normalizeUsername(row.username) ??
        this.normalizeUsername(this.usernameFromEmail(row.email)) ??
        this.normalizeUsername(row.nationalId) ??
        row.nationalId;

      const username = this.resolveUniqueUsername(baseUsername, usedUsernames);
      usedUsernames.add(username);

      const tempPassword = this.generateTempPassword();
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const entity = this.repository.create({
        nationalId: row.nationalId,
        username,
        passwordHash,
        role: 'teacher',
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone ?? null,
        isActive: true,
        mustChangePassword: true,
        tempPasswordIssuedAt: new Date(),
      });

      try {
        await this.repository.save(entity);
        created += 1;
        createdCredentials.push({
          nationalId: row.nationalId,
          username,
          tempPassword,
        });
      } catch (error) {
        skipped += 1;
        errors.push({
          row: row.rowNumber,
          message: 'No se pudo crear el usuario (conflicto o error de base de datos).',
        });
      }
    }

    return {
      total: rawRows.length,
      created,
      skipped,
      errors,
      credentials: createdCredentials,
    };
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

  private async buildTempPasswordHash(dto: CreateUsersDto): Promise<string> {
    const lastNameRaw = dto.lastName?.trim();
    if (!lastNameRaw) {
      throw new BadRequestException(
        'Last name is required to generate a temporary password.',
      );
    }
    const firstLastName = lastNameRaw.split(/\s+/)[0];

    const digits = dto.nationalId.replace(/\D/g, '');
    if (digits.length < 4) {
      throw new BadRequestException(
        'National ID must contain at least 4 digits to generate a temporary password.',
      );
    }

    const tempPassword = `${firstLastName}${digits.slice(-4)}`;
    return bcrypt.hash(tempPassword, 10);
  }

  private mapBulkRow(raw: Record<string, unknown>): {
    nationalId: string;
    firstName: string;
    lastName: string;
    email: string;
    username?: string;
    phone?: string;
  } {
    const normalized = this.normalizeRowKeys(raw);
    return {
      nationalId: String(normalized.nationalId ?? ''),
      firstName: String(normalized.firstName ?? ''),
      lastName: String(normalized.lastName ?? ''),
      email: String(normalized.email ?? ''),
      username: normalized.username ? String(normalized.username) : undefined,
      phone: normalized.phone ? String(normalized.phone) : undefined,
    };
  }

  private normalizeRowKeys(raw: Record<string, unknown>): Record<string, unknown> {
    const mapping: Record<string, string> = {
      nationalid: 'nationalId',
      national_id: 'nationalId',
      documento: 'nationalId',
      cedula: 'nationalId',
      id: 'nationalId',
      firstname: 'firstName',
      first_name: 'firstName',
      nombres: 'firstName',
      lastname: 'lastName',
      last_name: 'lastName',
      apellidos: 'lastName',
      email: 'email',
      correo: 'email',
      correoelectronico: 'email',
      phone: 'phone',
      telefono: 'phone',
      celular: 'phone',
      username: 'username',
      usuario: 'username',
    };

    const result: Record<string, unknown> = {};
    Object.entries(raw).forEach(([key, value]) => {
      const normalizedKey = key
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[-._]/g, '')
        .trim();
      const mappedKey = mapping[normalizedKey];
      if (mappedKey) {
        result[mappedKey] = value;
      }
    });
    return result;
  }

  private usernameFromEmail(email: string): string | null {
    const atIndex = email.indexOf('@');
    if (atIndex <= 0) {
      return null;
    }
    return email.slice(0, atIndex);
  }

  private normalizeUsername(username?: string | null): string | null {
    if (!username) {
      return null;
    }
    const trimmed = username.trim().toLowerCase().replace(/\s+/g, '.');
    if (!trimmed) {
      return null;
    }
    return trimmed.slice(0, 80);
  }

  private resolveUniqueUsername(base: string, used: Set<string>): string {
    let candidate = base.slice(0, 80);
    let suffix = 1;
    while (used.has(candidate)) {
      const suffixText = String(suffix);
      const maxBaseLength = 80 - suffixText.length;
      candidate = `${base.slice(0, maxBaseLength)}${suffixText}`;
      suffix += 1;
    }
    return candidate;
  }

  private generateTempPassword(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const length = 10;
    const bytes = randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i += 1) {
      result += alphabet[bytes[i] % alphabet.length];
    }
    return result;
  }
}
