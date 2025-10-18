import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

const UNIQUE_VIOLATION = '23505';

export class DbErrorMapper {
  static throwConflict(error: unknown, message: string): never {
    if (error instanceof QueryFailedError) {
      const driverError = (error as QueryFailedError).driverError as {
        code?: string;
        constraint?: string;
      };

      const code = driverError?.code;
      const constraint = driverError?.constraint?.toLowerCase() ?? '';

      if (code === UNIQUE_VIOLATION || constraint.startsWith('uniq_')) {
        throw new ConflictException(message);
      }
    }

    throw error;
  }
}
