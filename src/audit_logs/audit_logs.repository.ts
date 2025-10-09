import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { AuditLogs } from './audit_logs.entity';

@Injectable()
export class AuditLogsRepository extends BaseRepository<AuditLogs> {
  constructor(dataSource: DataSource) {
    super(AuditLogs, dataSource);
  }
}
