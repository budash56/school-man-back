import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const configService = app.get(ConfigService);
  app.use('/timetable/import/confirm', json({ limit: '512kb' }));
  app.use(json({ limit: '100kb' }));
  app.use(urlencoded({ extended: true, limit: '100kb' }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const port = configService.get<number>('app.port') ?? 3000;
  const serverUrl =
    configService.get<string>('app.apiBaseUrl') ?? `http://localhost:${port}`;
  const config = new DocumentBuilder()
    .setTitle('SchoolMan API')
    .setDescription('API documentation for the SchoolMan application')
    .setVersion('1.0')
    .addServer(serverUrl)
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api/docs', app, document);
  await app.listen(port);
}
bootstrap();
