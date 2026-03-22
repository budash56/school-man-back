import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { PlanillaSheets } from './planilla_sheets.entity';

@Injectable()
export class PlanillaSheetsRepository extends BaseRepository<PlanillaSheets> {
  constructor(dataSource: DataSource) {
    super(PlanillaSheets, dataSource);
  }
}
