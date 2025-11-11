import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { DbErrorMapper } from './db-error.mapper';

describe('DbErrorMapper', () => {
  it('throws ConflictException when error code is 23505', () => {
    const error = new QueryFailedError('', [], { code: '23505' });

    expect(() => DbErrorMapper.throwConflict(error, 'duplicate')).toThrow(
      ConflictException,
    );
  });

  it('throws ConflictException when constraint begins with uniq_', () => {
    const error = new QueryFailedError('', [], { constraint: 'UNIQ_test' });

    expect(() => DbErrorMapper.throwConflict(error, 'duplicate')).toThrow(
      ConflictException,
    );
  });

  it('rethrows unknown errors', () => {
    const error = new Error('oops');

    expect(() => DbErrorMapper.throwConflict(error, 'duplicate')).toThrow(
      error,
    );
  });
});
