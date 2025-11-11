import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsRepository } from './notifications.repository';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { Notifications } from './notifications.entity';
import {
  buildPaginationResult,
  PaginatedResult,
  resolvePagination,
} from '../shared/pagination';
import { DbErrorMapper } from '../shared/db-error.mapper';

export type NotificationResponse = {
  notificationId: number;
  title: string;
  message: string | null;
  isActive: boolean;
  createdAt: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly repository: NotificationsRepository) {}

  async findAll(
    query: QueryNotificationDto,
  ): Promise<PaginatedResult<NotificationResponse>> {
    const { page, pageSize } = resolvePagination(query.page, query.pageSize);

    const qb = this.repository
      .createQueryBuilder('notifications')
      .orderBy('notifications.createdAt', 'DESC');

    if (query.title?.trim()) {
      const keyword = `%${query.title.trim().replace(/[%_]/g, (m) => `\\${m}`)}%`;
      qb.andWhere("notifications.title ILIKE :title ESCAPE \\'", {
        title: keyword,
      });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('notifications.isActive = :isActive', {
        isActive: query.isActive,
      });
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

  async findOne(id: number): Promise<NotificationResponse> {
    const entity = await this.repository.findOne({
      where: { notificationId: id.toString() },
    });

    if (!entity) {
      throw new NotFoundException('Notification not found');
    }

    return this.toResponse(entity);
  }

  async create(dto: CreateNotificationDto): Promise<NotificationResponse> {
    const entity = this.repository.create({
      title: dto.title,
      message: dto.message ?? null,
      isActive: dto.isActive,
    });

    try {
      const saved = await this.repository.save(entity);
      return this.findOne(Number(saved.notificationId));
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Notification with this title already exists',
      );
    }
  }

  async update(
    id: number,
    dto: UpdateNotificationDto,
  ): Promise<NotificationResponse> {
    const entity = await this.getEntity(id);

    if (dto.title !== undefined) {
      entity.title = dto.title;
    }

    if (dto.message !== undefined) {
      entity.message = dto.message ?? null;
    }

    if (dto.isActive !== undefined) {
      entity.isActive = dto.isActive;
    }

    try {
      await this.repository.save(entity);
      return this.toResponse(entity);
    } catch (error) {
      DbErrorMapper.throwConflict(
        error,
        'Notification with this title already exists',
      );
    }
  }

  async remove(id: number): Promise<{ deleted: true }> {
    const entity = await this.getEntity(id);
    await this.repository.remove(entity);
    return { deleted: true };
  }

  private async getEntity(id: number): Promise<Notifications> {
    const entity = await this.repository.findOne({
      where: { notificationId: id.toString() },
    });

    if (!entity) {
      throw new NotFoundException('Notification not found');
    }

    return entity;
  }

  private toResponse(entity: Notifications): NotificationResponse {
    return {
      notificationId: Number(entity.notificationId),
      title: entity.title,
      message: entity.message ?? null,
      isActive: entity.isActive,
      createdAt: entity.createdAt ? entity.createdAt.toISOString() : null,
    };
  }
}
