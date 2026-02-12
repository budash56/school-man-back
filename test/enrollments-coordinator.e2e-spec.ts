import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { seedBasicData } from './helpers/seed';
import { SchoolYears } from '../src/school_years/school_years.entity';

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

describe('Enrollments coordinator override (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let coordinatorToken: string;
  let seedData: Awaited<ReturnType<typeof seedBasicData>>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    seedData = await seedBasicData(dataSource);

    adminToken = await login(app, seedData.users.admin);
    coordinatorToken = await login(app, seedData.users.coordinator);

    await dataSource.getRepository(SchoolYears).update(
      seedData.schoolYear.schoolYearId,
      { isActive: false },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows coordinator to enroll students in archived school years', async () => {
    const createStudentPayload = {
      nationalId: `ARCHIVE-${Date.now()}`,
      firstName: 'Archive',
      lastName: 'Student',
      guardianName: 'Guardian Archive',
      guardianRelationship: 'Parent',
      guardianPhone: '555-4321',
    };

    const studentResponse = await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createStudentPayload)
      .expect(201);

    const studentId = Number(studentResponse.body.studentId);

    const enrollmentBody = {
      studentId,
      classGroupId: Number(seedData.classGroup.classGroupId),
      schoolYearId: Number(seedData.schoolYear.schoolYearId),
    };

    const enrollmentResponse = await request(app.getHttpServer())
      .post('/enrollments')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send(enrollmentBody)
      .expect(201);

    expect(enrollmentResponse.body).toMatchObject({
      studentId,
      classGroupId: Number(seedData.classGroup.classGroupId),
      schoolYearId: Number(seedData.schoolYear.schoolYearId),
      active: true,
    });
  });
});
