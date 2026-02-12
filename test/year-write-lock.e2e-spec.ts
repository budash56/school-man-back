import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { seedBasicData, SeedResult } from './helpers/seed';
import { Terms } from '../src/terms/terms.entity';
import { Students } from '../src/students/students.entity';
import { Enrollments } from '../src/enrollments/enrollments.entity';

describe('Year write lock (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let teacherToken: string;
  let seedData: SeedResult;

  const seededIds: { courseId: number; studentId: number; termId: number } = {
    courseId: 0,
    studentId: 0,
    termId: 0,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);

    seedData = await seedBasicData(dataSource);
    adminToken = await login(seedData.users.admin);
    teacherToken = await login(seedData.users.teacher);

    await ensureYearWriteLockFixtures();
  });

  afterAll(async () => {
    await app.close();
  });

  it('prevents teachers from writing to inactive years while allowing admins', async () => {
    await request(app.getHttpServer())
      .post(`/school-years/${Number(seedData.schoolYear.schoolYearId)}/lock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/grades')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        studentId: seededIds.studentId,
        courseId: seededIds.courseId,
        termId: seededIds.termId,
        mark: 4,
      })
      .expect(403);

    const adminResponse = await request(app.getHttpServer())
      .post('/grades')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        studentId: seededIds.studentId,
        courseId: seededIds.courseId,
        termId: seededIds.termId,
        mark: 4,
      })
      .expect(201);

    expect(adminResponse.body).toEqual(
      expect.objectContaining({
        studentId: seededIds.studentId,
        courseId: seededIds.courseId,
        termId: seededIds.termId,
        mark: 'A',
      }),
    );
  });

  async function login(creds: { nationalId: string; password: string }): Promise<string> {
    const { body } = await request(app.getHttpServer())
      .post('/auth/login')
      .send(creds)
      .expect(201);

    return body.accessToken;
  }

  async function ensureYearWriteLockFixtures(): Promise<void> {
    const termsRepo = dataSource.getRepository(Terms);
    const studentsRepo = dataSource.getRepository(Students);
    const enrollmentsRepo = dataSource.getRepository(Enrollments);

    let term = await termsRepo.findOne({
      where: { schoolYearId: seedData.schoolYear.schoolYearId, name: 'P1' },
    });
    if (!term) {
      term = await termsRepo.save(
        termsRepo.create({
          schoolYearId: seedData.schoolYear.schoolYearId,
          name: 'P1',
          startDate: '2025-08-01',
          endDate: '2025-12-15',
          sortOrder: 1,
          isFinal: false,
        }),
      );
    }

    const student = await studentsRepo.save(
      studentsRepo.create({
        nationalId: `YEAR-LOCK-${Date.now()}`,
        firstName: 'Alice',
        lastName: 'Student',
        dob: '2010-01-01',
        address: '123 Main St',
        guardianName: 'Parent',
        guardianRelationship: 'Mother',
        guardianPhone: '5551234',
        isActive: true,
      }),
    );

    await enrollmentsRepo.save(
      enrollmentsRepo.create({
        studentId: student.studentId,
        classGroupId: seedData.classGroup.classGroupId,
        schoolYearId: seedData.schoolYear.schoolYearId,
        active: true,
      }),
    );

    seededIds.courseId = Number(seedData.course.courseId);
    seededIds.studentId = Number(student.studentId);
    seededIds.termId = Number(term.termId);
  }
});
