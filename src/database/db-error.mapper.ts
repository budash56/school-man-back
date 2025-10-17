import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

const UNIQUE_VIOLATION = '23505';

export class DbErrorMapper {
  static throwConflict(error: unknown, message: string): never {
    if (error instanceof QueryFailedError) {
      const driverError = (error as QueryFailedError).driverError as {
        code?: string;
      };

      if (driverError?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(message);
      }
    }

    throw error;
  }
}
