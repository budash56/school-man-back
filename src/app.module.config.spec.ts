jest.mock('./data-source', () => {
  const actual = jest.requireActual('./data-source');
  return {
    ...actual,
    buildDataSourceOptions: jest.fn().mockReturnValue({
      ...actual.buildDataSourceOptions(),
    }),
  };
});

describe('AppModule configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('passes env-based database settings into TypeORM factory', async () => {
    process.env.DATABASE_URL = 'postgres://config-user:pass@db:5432/configdb';
    process.env.DB_SSL = 'true';

    const dataSource = require('./data-source');
    await import('./app.module');

    expect(dataSource.buildDataSourceOptions).toHaveBeenCalledWith({
      databaseUrl: 'postgres://config-user:pass@db:5432/configdb',
      ssl: true,
    });
  });
});
