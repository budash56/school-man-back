import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class PrintIdService {
  constructor(private readonly dataSource: DataSource) {}

  async nextId(): Promise<number> {
    const result = await this.dataSource.query(
      `SELECT nextval('print_generation_seq') AS print_id`,
    );

    const raw =
      result?.[0]?.print_id ??
      result?.[0]?.nextval ??
      Object.values(result?.[0] ?? {})[0];

    const id = Number(raw);
    if (!Number.isFinite(id)) {
      throw new Error('Failed to obtain next print identifier');
    }
    return id;
  }
}
