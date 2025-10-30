import { Injectable, NotFoundException } from '@nestjs/common';
import { Brackets } from 'typeorm';
import { AuditLogsRepository } from './audit_logs.repository';
import { UsersRepository } from '../users/users.repository';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';
import { buildPaginationResult, PaginatedResult, resolvePagination } from '../shared/pagination';
import { AuditLogs } from './audit_logs.entity';
import { DbErrorMapper } from '../shared/db-error.mapper';
import { Users } from '../users/users.entity';

export type AuditLogResponse = {
  auditId: number;
  entityName: string;
  entityId: number | null;
  action: string;
  payload: Record<string, unknown> | null;
  performedAt: string | null;
  performedBy: string | null;
};

@Injectable()
export class AuditLogsService {
  constructor(
    private readonly auditLogsRepository: AuditLogsRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async findAll(query: QueryAuditLogDto): Promise<PaginatedResult<AuditLogResponse>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);

    const qb = this.auditLogsRepository
      .createQueryBuilder('auditLogs')
      .leftJoinAndSelect('auditLogs.performedBy', 'performedBy')
      .orderBy('auditLogs.performedAt', 'DESC');

    if (query.entityName?.trim()) {
      const keyword = `%${query.entityName.trim().replace(/[%_]/g, (m) => `\\${m}`)}%`;
      qb.andWhere('auditLogs.entityName ILIKE :entityName ESCAPE \\\'', {
        entityName: keyword,
      });
    }

    if (query.action?.trim()) {
      const keyword = `%${query.action.trim().replace(/[%_]/g, (m) => `\\${m}`)}%`;
      qb.andWhere('auditLogs.action ILIKE :action ESCAPE \\\'', {
        action: keyword,
      });
    }

    if (query.performedBy?.trim()) {
      qb.andWhere('auditLogs.performedBy = :performedBy', {
        performedBy: query.performedBy.trim(),
      });
    }

    if (query.from) {
      qb.andWhere('auditLogs.performedAt >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('auditLogs.performedAt <= :to', { to: query.to });
    }

    qb.skip((page - 1) * pageSize);
    qb.take(pageSize);

    const [entities, total] = await qb.getManyAndCount();

    return buildPaginationResult(
      entities.map((entity) => this.toResponse(entity)),
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: number): Promise<AuditLogResponse> {
    const entity = await this.auditLogsRepository.findOne({
      where: { auditId: id.toString() },
      relations: { performedBy: true },
    });

    if (!entity) {
      throw new NotFoundException('Audit log not found');
    }

    return this.toResponse(entity);
  }

  async create(dto: CreateAuditLogDto): Promise<AuditLogResponse> {
    const performer = await this.resolvePerformer(dto.performedBy);

    const entity = this.auditLogsRepository.create({
      entityName: dto.entityName,
      entityId: dto.entityId !== undefined ? dto.entityId.toString() : null,
      action: dto.action,
      payload: dto.payload ?? null,
      performedAt: dto.performedAt ? new Date(dto.performedAt) : new Date(),
      performedBy: performer,
    });

    try {
      const saved = await this.auditLogsRepository.save(entity);
      return this.findOne(Number(saved.auditId));
    } catch (error) {
      DbErrorMapper.throwConflict(error, 'Audit log already exists');
    }
  }

  async update(id: number, dto: UpdateAuditLogDto): Promise<AuditLogResponse> {
    const entity = await this.getAuditLogEntity(id);

    if (dto.entityName !== undefined) {
      entity.entityName = dto.entityName;
    }

    if (dto.entityId !== undefined) {
      entity.entityId = dto.entityId !== undefined ? dto.entityId.toString() : null;
    }

    if (dto.action !== undefined) {
      entity.action = dto.action;
    }

    if (dto.payload !== undefined) {
      entity.payload = dto.payload ?? null;
    }

    if (dto.performedAt !== undefined) {
      entity.performedAt = dto.performedAt ? new Date(dto.performedAt) : null;
    }

    if (dto.performedBy !== undefined) {
      entity.performedBy = await this.resolvePerformer(dto.performedBy);
    }

    try {
      const saved = await this.auditLogsRepository.save(entity);
      return this.toResponse(saved);
    } catch (error) {
      DbErrorMapper.throwConflict(error, 'Audit log already exists');
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const entity = await this.getAuditLogEntity(id);
    await this.auditLogsRepository.remove(entity);
    return { deleted: true };
  }

  private async getAuditLogEntity(id: number): Promise<AuditLogs> {
    const entity = await this.auditLogsRepository.findOne({
      where: { auditId: id.toString() },
      relations: { performedBy: true },
    });

    if (!entity) {
      throw new NotFoundException('Audit log not found');
    }

    return entity;
  }

  private async resolvePerformer(nationalId: string): Promise<Users> {
    const user = await this.usersRepository.findOne({
      where: { nationalId },
    });

    if (!user) {
      throw new NotFoundException('User not found for performedBy');
    }

    return user;
  }

  private toResponse(entity: AuditLogs): AuditLogResponse {
    return {
      auditId: Number(entity.auditId),
      entityName: entity.entityName,
      entityId: entity.entityId ? Number(entity.entityId) : null,
      action: entity.action,
      payload: (entity.payload ?? null) as Record<string, unknown> | null,
      performedAt: entity.performedAt ? entity.performedAt.toISOString() : null,
      performedBy: entity.performedBy?.nationalId ?? null,
    };
  }
}
