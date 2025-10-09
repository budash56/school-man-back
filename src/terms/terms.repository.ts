import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { Terms } from './terms.entity';

@Injectable()
export class TermsRepository extends BaseRepository<Terms> {
  constructor(dataSource: DataSource) {
    super(Terms, dataSource);
  }
}
