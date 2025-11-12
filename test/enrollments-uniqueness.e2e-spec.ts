import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { seedBasicData } from './helpers/seed';

const coordinator = { nationalId: 'coord-001', password: 'Coord#123' };

describe('Enrollments uniqueness (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let coordinatorToken: string;
  let studentId: number;
  let classGroupId: number;
  let schoolYearId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    const seed = await seedBasicData(dataSource);
    coordinatorToken = await login(coordinator);
    classGroupId = Number(seed.classGroup.classGroupId);
    schoolYearId = Number(seed.schoolYear.schoolYearId);

    const studentResponse = await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        nationalId: 'ENR-UNI-001',
        firstName: 'Unique',
        lastName: 'Student',
        guardianName: 'Guardian',
        guardianRelationship: 'Parent',
        guardianPhone: '555-1111',
      })
      .expect(201);
    studentId = Number(studentResponse.body.studentId);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects second active enrollment in same year', async () => {
    await request(app.getHttpServer())
      .post('/enrollments')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ studentId, classGroupId, schoolYearId })
      .expect(201);

    await request(app.getHttpServer())
      .post('/enrollments')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ studentId, classGroupId, schoolYearId })
      .expect(409);
  });

  async function login(creds: { nationalId: string; password: string }) {
    const { body } = await request(app.getHttpServer())
      .post('/auth/login')
      .send(creds)
      .expect(201);
    return body.accessToken as string;
  }
});
