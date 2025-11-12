import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { seedBasicData } from './helpers/seed';
import { Attendance } from '../src/attendance/attendance.entity';
import { Students } from '../src/students/students.entity';
import { Enrollments } from '../src/enrollments/enrollments.entity';

describe('Attendance uniqueness (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let studentId: number;
  let courseId: number;
  let slotId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    const seed = await seedBasicData(dataSource);
    authToken = await login(seed.users.admin);

    const studentsRepo = dataSource.getRepository(Students);
    const enrollmentsRepo = dataSource.getRepository(Enrollments);

    const dedicatedStudent = await studentsRepo.save(
      studentsRepo.create({
        nationalId: `ATT-UNIQ-${Date.now()}`,
        firstName: 'Attendance',
        lastName: 'Tester',
        guardianName: 'Guardian',
        guardianRelationship: 'Parent',
        guardianPhone: '5550000',
      }),
    );
    studentId = Number(dedicatedStudent.studentId);

    await enrollmentsRepo.save(
      enrollmentsRepo.create({
        studentId: dedicatedStudent.studentId,
        classGroupId: seed.classGroup.classGroupId,
        schoolYearId: seed.schoolYear.schoolYearId,
        active: true,
      }),
    );

    courseId = Number(seed.course.courseId);
    slotId = Number(seed.timetableSlot.slotId);
  });

  beforeEach(async () => {
    await dataSource
      .getRepository(Attendance)
      .createQueryBuilder()
      .delete()
      .where('1=1')
      .execute();
  });

  afterAll(async () => {
    await app.close();
  });

  it('prevents duplicate attendance for same slot/date/student', async () => {
    await recordAttendance('2025-02-10', slotId);

    await request(app.getHttpServer())
      .post('/attendance')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        studentId,
        courseId,
        slotId,
        date: '2025-02-10',
        status: 'P',
      })
      .expect(409);
  });

  it('allows legacy path when slot is null but enforces per-course/day uniqueness', async () => {
    await recordAttendance('2025-02-11', null);

    await request(app.getHttpServer())
      .post('/attendance')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        studentId,
        courseId,
        slotId: null,
        date: '2025-02-11',
        status: 'P',
      })
      .expect(409);
  });

  async function recordAttendance(date: string, slot: number | null) {
    const payload: Record<string, unknown> = {
      studentId,
      courseId,
      date,
      status: 'P',
    };
    if (slot !== null) {
      payload.slotId = slot;
    }

    await request(app.getHttpServer())
      .post('/attendance')
      .set('Authorization', `Bearer ${authToken}`)
      .send(payload)
      .expect(201);
  }

  async function login(creds: { nationalId: string; password: string }) {
    const { body } = await request(app.getHttpServer())
      .post('/auth/login')
      .send(creds)
      .expect(201);
    return body.accessToken as string;
  }
});
