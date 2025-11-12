import configuration from './configuration';

describe('configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('maps environment variables to config object', async () => {
    process.env.PORT = '4100';
    process.env.API_BASE_URL = 'https://api.example.com';
    process.env.JWT_SECRET = 'spec-secret';
    process.env.DB_NAME = 'config_spec';
    process.env.DB_SSL = 'true';

    const cfg = configuration();

    expect(cfg.app.port).toBe(4100);
    expect(cfg.app.apiBaseUrl).toBe('https://api.example.com');
    expect(cfg.jwt.secret).toBe('spec-secret');
    expect(cfg.database.url).toContain('config_spec');
    expect(cfg.database.ssl).toBe(true);
  });
});

describe('buildDataSourceOptions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses overrides when provided', () => {
    jest.resetModules();
    jest.isolateModules(() => {
      const { buildDataSourceOptions } = require('../data-source');
      const options = buildDataSourceOptions({
        databaseUrl: 'postgres://spec-user:pass@localhost:5432/specdb',
        ssl: true,
      });

      expect(options.url).toBe(
        'postgres://spec-user:pass@localhost:5432/specdb',
      );
      expect(options.ssl).toEqual({ rejectUnauthorized: false });
    });
  });

  it('falls back to environment variables', () => {
    process.env.DATABASE_URL =
      'postgres://override:pass@localhost:5432/env_spec_db';
    jest.resetModules();
    jest.isolateModules(() => {
      const module = require('../data-source');
      expect(module.appDataSourceOptions.url).toBe(
        'postgres://override:pass@localhost:5432/env_spec_db',
      );
    });
  });
});
