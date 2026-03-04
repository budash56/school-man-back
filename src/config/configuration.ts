export type AppConfig = {
  app: {
    port: number;
    apiBaseUrl: string | null;
    isOpenApiExport: boolean;
  };
  database: {
    url: string;
    ssl: boolean;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
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
  },
  jwt: {
    secret: env.JWT_SECRET ?? 'change-me',
    expiresIn: env.JWT_EXPIRES_IN ?? '30d', // testing
  },
});

export default configuration;
