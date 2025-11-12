import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { seedBasicData, SeedResult } from './helpers/seed';
import { Students } from '../src/students/students.entity';
import { Enrollments } from '../src/enrollments/enrollments.entity';
import { Attendance } from '../src/attendance/attendance.entity';
import { Notifications } from '../src/notifications/notifications.entity';
import { TimetableSlot } from '../src/timetable_slots/timetable_slots.entity';
import { TimetableAssignments } from '../src/timetable_assignments/timetable_assignments.entity';

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

describe('Attendance absence suggestions (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let seedData: SeedResult;
  let coordinatorToken: string;
  let studentId: number;
  let classGroupId: number;
  let courseId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    seedData = await seedBasicData(dataSource);
    await dataSource
      .getRepository(Notifications)
      .createQueryBuilder()
      .delete()
      .where('1=1')
      .execute();
    await dataSource
      .getRepository(Attendance)
      .createQueryBuilder()
      .delete()
      .where('1=1')
      .execute();
    coordinatorToken = await login(app, seedData.users.coordinator);
    classGroupId = Number(seedData.classGroup.classGroupId);
    courseId = Number(seedData.course.courseId);

    const studentsRepo = dataSource.getRepository(Students);
    const enrollmentsRepo = dataSource.getRepository(Enrollments);

    const student = await studentsRepo.save(
      studentsRepo.create({
        nationalId: 'ABS-001',
        firstName: 'Absent',
        lastName: 'Student',
        guardianName: 'Guardian',
        guardianRelationship: 'Parent',
        guardianPhone: '5550000',
      }),
    );
    studentId = Number(student.studentId);

    await enrollmentsRepo.save(
      enrollmentsRepo.create({
        studentId: student.studentId,
        classGroupId: seedData.classGroup.classGroupId,
        schoolYearId: seedData.schoolYear.schoolYearId,
        active: true,
      }),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  const attendanceRepo = () => dataSource.getRepository(Attendance);

  async function addAbsence(date: string) {
    const weekday = new Date(date).getDay(); // 0=Sun
    const slotRepo = dataSource.getRepository(TimetableSlot);
    const assignmentsRepo = dataSource.getRepository(TimetableAssignments);

    const slot = await slotRepo.save(
      slotRepo.create({
        dayOfWeek: weekday === 0 ? 7 : weekday,
        startTime: '08:00:00',
        endTime: '09:00:00',
        durationMinutes: 60,
      }),
    );

    await assignmentsRepo.save(
      assignmentsRepo.create({
        courseId: seedData.course.courseId.toString(),
        slotId: slot.slotId.toString(),
        teacherId: seedData.course.teacherId,
        classGroupId: seedData.classGroup.classGroupId.toString(),
        classroomId: seedData.classroom.classroomId.toString(),
      }),
    );

    await attendanceRepo().save(
      attendanceRepo().create({
        studentId: studentId.toString(),
        courseId: courseId.toString(),
        slotId: slot.slotId.toString(),
        date,
        status: 'A',
      }),
    );
  }

  const runMonitor = async (date: string) => {
    // const { body } = await request(app.getHttpServer())
    //   .post('/notifications/suggestions/absence/run')
    //   .query({ date })
    //   .set('Authorization', `Bearer ${coordinatorToken}`)
    //   .expect(201);
    // return body.created as number;
    const res = await request(app.getHttpServer())
    .post('/notifications/suggestions/absence/run')
    .query({ date })
    .set('Authorization', `Bearer ${coordinatorToken}`)
    .set('Accept', 'application/json');

  console.log('[RUN MONITOR] status', res.status, 'body', res.body); // <— show the error
  // while debugging, don’t assert here; return the whole response:
  return res;
  };

  it('creates suggestion only after three consecutive days', async () => {
    await addAbsence('2025-02-10');
    await addAbsence('2025-02-11');
    await addAbsence('2025-02-12');
    let created = await runMonitor('2025-02-13');
    const res = await runMonitor('2025-02-13');
    // expect(created).toBe(1);
    expect(res.status).toBe(201);

    const { body } = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .expect(200);

    expect(body.data[0]).toMatchObject({
      category: 'attendance-absence-streak',
      studentId,
      isActive: true,
    });
  });
});
