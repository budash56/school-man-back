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
    process.env.SCANNER_BASE_URL = 'http://scanner:8010';
    process.env.SCANNER_TIMEOUT_MS = '25000';

    const cfg = configuration();

    expect(cfg.app.port).toBe(4100);
    expect(cfg.app.apiBaseUrl).toBe('https://api.example.com');
    expect(cfg.jwt.secret).toBe('spec-secret');
    expect(cfg.database.url).toContain('config_spec');
    expect(cfg.database.ssl).toBe(true);
    expect(cfg.scanner.baseUrl).toBe('http://scanner:8010');
    expect(cfg.scanner.timeoutMs).toBe(25000);
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
