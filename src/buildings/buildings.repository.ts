import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { Buildings } from './buildings.entity';

@Injectable()
export class BuildingsRepository extends BaseRepository<Buildings> {
  constructor(dataSource: DataSource) {
    super(Buildings, dataSource);
  }
}
