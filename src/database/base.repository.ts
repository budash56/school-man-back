import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';

/**
 * Base repository that wires up a concrete TypeORM repository using Nest's injected DataSource.
 */
export abstract class BaseRepository<T extends ObjectLiteral> extends Repository<T> {
  protected constructor(target: EntityTarget<T>, dataSource: DataSource) {
    super(target, dataSource.createEntityManager());
  }
}
