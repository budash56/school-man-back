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

describe('Student deletion and attendance roster (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let seedData: SeedResult;
  let adminToken: string;
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
    seedData = await seedBasicData(dataSource);
    adminToken = await login(app, seedData.users.admin);
    classGroupId = Number(seedData.classGroup.classGroupId);
    schoolYearId = Number(seedData.schoolYear.schoolYearId);

    const studentResponse = await request(app.getHttpServer())
      .post('/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nationalId: `STU-ATT-${Date.now()}`,
        firstName: 'Roster',
        lastName: 'Target',
        guardianName: 'Guardian',
        guardianRelationship: 'Parent',
        guardianPhone: '5550000',
      })
      .expect(201);

    studentId = Number(studentResponse.body.studentId);

    await request(app.getHttpServer())
      .post('/enrollments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId,
        classGroupId,
        schoolYearId,
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  const rosterDate = '2025-02-15';

  const fetchRoster = async () => {
    const { body } = await request(app.getHttpServer())
      .get('/attendance/sheet')
      .query({ classGroupId, date: rosterDate })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    return body.students as Array<{ studentId: number }>;
  };

  it('excludes deleted students from future attendance sheets until restored', async () => {
    let roster = await fetchRoster();
    expect(roster.some((student) => student.studentId === studentId)).toBe(true);

    await request(app.getHttpServer())
      .delete(`/students/${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    roster = await fetchRoster();
    expect(roster.some((student) => student.studentId === studentId)).toBe(
      false,
    );

    await request(app.getHttpServer())
      .post(`/students/${studentId}/restore`)
      .query({ year: schoolYearId })
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    roster = await fetchRoster();
    expect(roster.some((student) => student.studentId === studentId)).toBe(
      true,
    );
  });
});
