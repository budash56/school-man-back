import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { DisciplinaryRecords } from './disciplinary_records.entity';

@Injectable()
export class DisciplinaryRecordsRepository extends BaseRepository<DisciplinaryRecords> {
  constructor(dataSource: DataSource) {
    super(DisciplinaryRecords, dataSource);
  }
}
