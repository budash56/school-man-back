import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../database/base.repository';
import { Classrooms } from './classrooms.entity';

@Injectable()
export class ClassroomsRepository extends BaseRepository<Classrooms> {
  constructor(dataSource: DataSource) {
    super(Classrooms, dataSource);
  }
}
