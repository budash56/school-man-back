import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { seedBasicData } from './helpers/seed';

async function login(
  app: INestApplication,
  creds: { nationalId: string; password: string },
): Promise<string> {
  const { body } = await request(app.getHttpServer())
    .post('/auth/login')
    .send(creds)
    .expect(201);
  return body.accessToken as string;
}

describe('Students soft delete + restore (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let dataSource: DataSource;
  let schoolYearId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);

    const seeds = await seedBasicData(dataSource);
    adminToken = await login(app, seeds.users.admin);
    schoolYearId = Number(seeds.schoolYear.schoolYearId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows admin to soft delete and restore students', async () => {
    const createPayload = {
      nationalId: 'SOFT-100',
      firstName: 'Soft',
      lastName: 'Delete',
      guardianName: 'Guardian Soft',
      guardianRelationship: 'Parent',
      guardianPhone: '555-0000',
    };

    const createResponse = await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createPayload)
      .expect(201);

    const studentId = Number(createResponse.body.studentId);
    expect(studentId).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .delete(`/students/${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect({ deleted: true });

    await request(app.getHttpServer())
      .get(`/students/${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    const restoreResponse = await request(app.getHttpServer())
      .post(`/students/${studentId}/restore`)
      .query({ year: schoolYearId })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Number(restoreResponse.body.studentId)).toBe(studentId);
    expect(restoreResponse.body.deletedAt).toBeNull();
    expect(restoreResponse.body.isActive).toBe(true);

    const getResponse = await request(app.getHttpServer())
      .get(`/students/${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(getResponse.body).toMatchObject({
      studentId: studentId.toString(),
      nationalId: createPayload.nationalId,
    });
  });
});
