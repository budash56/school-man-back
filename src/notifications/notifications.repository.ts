import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { Notifications } from './notifications.entity';

@Injectable()
export class NotificationsRepository extends BaseRepository<Notifications> {
  constructor(dataSource: DataSource) {
    super(Notifications, dataSource);
  }
}
