import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

// Prefer DATABASE_URL (postgres://user:pass@host:5432/db) but support discrete vars too.
const url =
  process.env.DATABASE_URL ??
  `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASS || ''}` +
    `@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'schoolmg'}`;

export const appDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url,
  synchronize: false, // <- keep OFF
  migrationsRun: true, // <- auto-apply pending migrations on boot if you call .initialize()
  logging: ['error', 'warn'], // add 'schema','query' only when debugging
  namingStrategy: new SnakeNamingStrategy(),
  // if you use SSL in prod:
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [__dirname + '/**/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
};

const AppDataSource = new DataSource(appDataSourceOptions);

export default AppDataSource;
