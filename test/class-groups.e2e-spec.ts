import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { seedBasicData, SeedResult } from './helpers/seed';

async function login(
  app: INestApplication,
  creds: { nationalId: string; password: string },
) {
  const { body } = await request(app.getHttpServer())
    .post('/auth/login')
    .send(creds)
    .expect(201);
  return body.accessToken as string;
}

describe('ClassGroups (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let coordinatorToken: string;
  let registrarToken: string;
  let seedData: SeedResult;
  let schoolYearId: number;
  let section: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);

    seedData = await seedBasicData(dataSource);
    schoolYearId = Number(seedData.schoolYear.schoolYearId);
    const sectionValue = (Date.now() % 90) + 10;
    section = String(sectionValue).padStart(2, '0');

    coordinatorToken = await login(app, seedData.users.coordinator);
    registrarToken = await login(app, seedData.users.registrar);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects POST without token', () => {
    return request(app.getHttpServer())
      .post('/class-groups')
      .send({ schoolYearId, gradeLevel: 9, section })
      .expect(401);
  });

  it('rejects POST with registrar token', () => {
    return request(app.getHttpServer())
      .post('/class-groups')
      .set('Authorization', `Bearer ${registrarToken}`)
      .send({ schoolYearId, gradeLevel: 9, section })
      .expect(403);
  });

  it('creates class group with coordinator and detects duplicate', async () => {
    await request(app.getHttpServer())
      .post('/class-groups')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        schoolYearId,
        gradeLevel: 9,
        section,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/class-groups')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        schoolYearId,
        gradeLevel: 9,
        section,
      })
      .expect(409);
  });

  it('lists class groups with filters', async () => {
    const { body } = await request(app.getHttpServer())
      .get('/class-groups')
      .query({ schoolYearId, gradeLevel: 9 })
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .expect(200);

    expect(body).toEqual({
      data: expect.any(Array),
      total: expect.any(Number),
      page: expect.any(Number),
      pageSize: expect.any(Number),
    });
    expect(body.data[0]).toMatchObject({ gradeLevel: 9, section });
  });
});
