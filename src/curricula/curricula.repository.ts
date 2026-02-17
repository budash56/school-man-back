import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { Curricula } from './curricula.entity';

@Injectable()
export class CurriculaRepository extends BaseRepository<Curricula> {
  constructor(dataSource: DataSource) {
    super(Curricula, dataSource);
  }
}
