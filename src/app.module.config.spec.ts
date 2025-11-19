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
  it('passes env-based database settings into TypeORM factory', async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'database.url') {
          return 'postgres://config-user:pass@db:5432/configdb';
        }
        if (key === 'database.ssl') {
          return true;
        }
        if (key === 'app.isOpenApiExport') {
          return false;
        }
        return undefined;
      }),
    } as unknown as import('@nestjs/config').ConfigService;

    const dataSource = require('./data-source');
    const { buildTypeOrmRootOptions } = await import('./app.module');
    buildTypeOrmRootOptions(mockConfigService);

    expect(dataSource.buildDataSourceOptions).toHaveBeenCalledWith({
      databaseUrl: 'postgres://config-user:pass@db:5432/configdb',
      ssl: true,
    });
  });
});
