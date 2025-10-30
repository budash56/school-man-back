import { writeFile } from 'fs/promises';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function exportOpenApi(): Promise<void> {
  process.env.OPENAPI_EXPORT = '1';

  // Patch TypeORM DataSource initialization to avoid real database connections.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const typeorm = require('typeorm') as typeof import('typeorm');
  if (!(typeorm.DataSource.prototype as { __openapiPatched?: boolean }).__openapiPatched) {
    const dataSourceProto = typeorm.DataSource.prototype as typeorm.DataSource & {
      __openapiPatched?: boolean;
    };
    dataSourceProto.initialize = async function initializeStub() {
      this.isInitialized = true;
      this.manager = new typeorm.EntityManager(this);
      return this;
    };
    dataSourceProto.destroy = async function destroyStub() {
      this.isInitialized = false;
    };
    (typeorm.DataSource.prototype as { __openapiPatched?: boolean }).__openapiPatched = true;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { AppModule } = require('../src/app.module');

  let app;
  try {
    app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  } catch (error) {
    console.error('Failed during NestFactory.create', error);
    throw error;
  }
  try {
    await app.init();
  } catch (error) {
    console.error('Failed during app.init()', error);
    throw error;
  }

  const config = new DocumentBuilder()
    .setTitle('School Man API')
    .setDescription('Generated OpenAPI specification for School Man backend')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  await app.close();

  const outputPath = join(process.cwd(), 'openapi.json');
  await writeFile(outputPath, JSON.stringify(document, null, 2));
  // eslint-disable-next-line no-console
  console.log(`OpenAPI document written to ${outputPath}`);
}

exportOpenApi().catch((error) => {
  console.error('Failed to export OpenAPI document:', error);
  process.exit(1);
});
