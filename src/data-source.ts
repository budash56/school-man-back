import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import configuration from './config/configuration';

type DataSourceOverrides = {
  databaseUrl?: string;
  ssl?: boolean;
};

export const buildDataSourceOptions = (
  overrides?: DataSourceOverrides,
): DataSourceOptions => {
  const config = configuration();
  const url = overrides?.databaseUrl ?? config.database.url;
  const sslEnabled = overrides?.ssl ?? config.database.ssl;

  return {
    type: 'postgres',
    url,
    synchronize: false, // <- keep OFF
    migrationsRun: true, // <- auto-apply pending migrations on boot if you call .initialize()
    logging: ['error', 'warn'], // add 'schema','query' only when debugging
    namingStrategy: new SnakeNamingStrategy(),
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    entities: [__dirname + '/**/*.entity.{ts,js}'],
    migrations: [__dirname + '/migrations/*.{ts,js}'],
  };
};

export const appDataSourceOptions = buildDataSourceOptions();

const AppDataSource = new DataSource(appDataSourceOptions);

export default AppDataSource;
