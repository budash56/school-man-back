import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { seedBasicData, SeedResult } from './helpers/seed';
import { Students } from '../src/students/students.entity';
import { Terms } from '../src/terms/terms.entity';
import { Grades } from '../src/grades/grades.entity';
import { Users } from '../src/users/users.entity';

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

describe('Reports (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let seedData: SeedResult;
  let coordinatorToken: string;
  let teacherToken: string;
  let outsiderTeacherToken: string;
  let student: Students;
  let terms: Terms[];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    seedData = await seedBasicData(dataSource);

    await setupStudentsAndGrades();

    coordinatorToken = await login(app, seedData.users.coordinator);
    teacherToken = await login(app, seedData.users.teacher);
    outsiderTeacherToken = await createAndLoginOutsiderTeacher();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setupStudentsAndGrades(): Promise<void> {
    const studentsRepo = dataSource.getRepository(Students);
    const termsRepo = dataSource.getRepository(Terms);
    const gradesRepo = dataSource.getRepository(Grades);

    const existingStudent = await studentsRepo.findOne({
      where: { studentId: seedData.student.studentId },
    });

    if (!existingStudent) {
      throw new Error('Seed student missing for reports tests');
    }
    student = existingStudent;

    terms = await Promise.all(
      ['P1', 'P2', 'P3', 'P4'].map((name, index) =>
        termsRepo.save(
          termsRepo.create({
            schoolYearId: seedData.schoolYear.schoolYearId,
            name,
            startDate: `2025-0${index + 1}-01`,
            endDate: `2025-0${index + 1}-28`,
            sortOrder: index + 1,
            isFinal: false,
          }),
        ),
      ),
    );

    const marks = [5, 4, 3, 1];
    for (let i = 0; i < terms.length; i++) {
      await gradesRepo.save(
        gradesRepo.create({
          studentId: student.studentId,
          courseId: seedData.course.courseId,
          termId: terms[i].termId,
          mark: marks[i],
        }),
      );
    }
  }

  async function createAndLoginOutsiderTeacher(): Promise<string> {
    const usersRepo = dataSource.getRepository(Users);
    const uniqueId = String(820000000 + (Date.now() % 100000));
    const outsider = await usersRepo.save(
      usersRepo.create({
        nationalId: uniqueId,
        username: `teach-${uniqueId}`,
        passwordHash: await bcrypt.hash('Teach#999', 10),
        role: 'teacher',
        isActive: true,
      }),
    );
    return login(app, {
      nationalId: outsider.nationalId,
      password: 'Teach#999',
    });
  }

  it('generates active-student certificate with incremental print ids', async () => {
    await dataSource.query(`SELECT setval('print_generation_seq', 1, false);`);

    const payload = {
      studentId: Number(student.studentId),
      schoolYearId: Number(seedData.schoolYear.schoolYearId),
    };

    const response1 = await request(app.getHttpServer())
      .post('/reports/certificates/active-student')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send(payload)
      .expect(201);

    const response2 = await request(app.getHttpServer())
      .post('/reports/certificates/active-student')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send(payload)
      .expect(201);

    expect(response2.body.printId).toBe(response1.body.printId + 1);
  });

  it('enforces teacher scoping on term grade reports', async () => {
    const termId = Number(terms[0].termId);
    const studentId = Number(student.studentId);
    const courseId = Number(seedData.course.courseId);

    const success = await request(app.getHttpServer())
      .get('/reports/grades/term')
      .query({ studentId, courseId, termId })
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);

    expect(success.body.printId).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .get('/reports/grades/term')
      .query({ studentId, courseId, termId })
      .set('Authorization', `Bearer ${outsiderTeacherToken}`)
      .expect(403);
  });

  it('returns consecutive print ids for term reports', async () => {
    await dataSource.query(`SELECT setval('print_generation_seq', 1, false);`);

    const params = {
      studentId: Number(student.studentId),
      courseId: Number(seedData.course.courseId),
      termId: Number(terms[1].termId),
    };

    const first = await request(app.getHttpServer())
      .get('/reports/grades/term')
      .query(params)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .expect(200);

    const second = await request(app.getHttpServer())
      .get('/reports/grades/term')
      .query(params)
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .expect(200);

    expect(second.body.printId).toBe(first.body.printId + 1);
  });

  it('returns final grade summary with correct rounding', async () => {
    const res = await request(app.getHttpServer())
      .get('/reports/grades/final')
      .query({
        studentId: Number(student.studentId),
        courseId: Number(seedData.course.courseId),
        schoolYearId: Number(seedData.schoolYear.schoolYearId),
      })
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .expect(200);

    expect(res.body.summary.finalLetter).toBe('B');
    expect(res.body.summary.termMarks).toEqual([5, 4, 3, 1]);
    expect(res.body.printId).toBeGreaterThan(0);
  });
});
