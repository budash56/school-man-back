export type AppConfig = {
  app: {
    port: number;
    apiBaseUrl: string | null;
    isOpenApiExport: boolean;
  };
  database: {
    url: string;
    ssl: boolean;
    migrationsRun: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  email: {
    enabled: boolean;
    provider: string;
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    fromName: string;
    fromAddress: string;
    bulkBatchSize: number;
  };
  scanner: {
    baseUrl: string | null;
    timeoutMs: number;
  };
};

const parseInteger = (value: string | undefined, fallback: number): number => {
  const parsed = parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const resolveDatabaseUrl = (env: NodeJS.ProcessEnv): string => {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  const user = env.DB_USER || 'postgres';
  const password = env.DB_PASS || '';
  const host = env.DB_HOST || 'localhost';
  const port = env.DB_PORT || '5432';
  const name = env.DB_NAME || 'schoolmg';
  return `postgres://${user}:${password}@${host}:${port}/${name}`;
};

const configuration = (env: NodeJS.ProcessEnv = process.env): AppConfig => ({
  app: {
    port: parseInt(env.PORT ?? '3000', 10),
    apiBaseUrl: env.API_BASE_URL ?? null,
    isOpenApiExport: env.OPENAPI_EXPORT === '1',
  },
  database: {
    url: resolveDatabaseUrl(env),
    ssl: env.DB_SSL === 'true',
    migrationsRun: env.DB_MIGRATIONS_RUN !== 'false',
  },
  jwt: {
    secret: env.JWT_SECRET ?? 'change-me',
    expiresIn: env.JWT_EXPIRES_IN ?? '30d', // testing
  },
  email: {
    enabled: env.EMAIL_ENABLED === 'true',
    provider: env.EMAIL_PROVIDER ?? 'smtp',
    host: env.EMAIL_HOST ?? '',
    port: parseInteger(env.EMAIL_PORT, 465),
    secure: env.EMAIL_SECURE === 'true',
    user: env.EMAIL_USER ?? '',
    pass: env.EMAIL_PASS ?? '',
    fromName: env.EMAIL_FROM_NAME ?? '',
    fromAddress: env.EMAIL_FROM_ADDRESS ?? '',
    bulkBatchSize: parseInteger(env.EMAIL_BULK_BATCH_SIZE, 20),
  },
  scanner: {
    baseUrl: env.SCANNER_BASE_URL?.trim() || null,
    timeoutMs: parseInteger(env.SCANNER_TIMEOUT_MS, 120000),
  },
});

export default configuration;
