import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { seedBasicData, SeedResult } from './helpers/seed';
import { Students } from '../src/students/students.entity';
import { Enrollments } from '../src/enrollments/enrollments.entity';
import { Attendance } from '../src/attendance/attendance.entity';
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


    coordinatorToken = await login(app, seedData.users.coordinator);
    classGroupId = Number(seedData.classGroup.classGroupId);
    courseId = Number(seedData.course.courseId);

    const studentsRepo = dataSource.getRepository(Students);
    const enrollmentsRepo = dataSource.getRepository(Enrollments);

    const student = await studentsRepo.save(
      studentsRepo.create({
        nationalId: `ABS-${Date.now()}`,
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

    const dayOfWeek = weekday === 0 ? 7 : weekday;
    let slot = await slotRepo.findOne({
      where: { dayOfWeek, startTime: '08:00:00', endTime: '09:00:00' },
    });
    if (!slot) {
      slot = await slotRepo.save(
        slotRepo.create({
          dayOfWeek,
          startTime: '08:00:00',
          endTime: '09:00:00',
          durationMinutes: 60,
        }),
      );
    }

    // TimetableAssignments fields are still strings in the entity → keep as strings
    const existingAssignment = await assignmentsRepo.findOne({
      where: {
        courseId: seedData.course.courseId.toString(),
        slotId: slot.slotId.toString(),
      },
    });
    if (!existingAssignment) {
      await assignmentsRepo.save(
        assignmentsRepo.create({
          courseId: seedData.course.courseId.toString(),
          slotId: slot.slotId.toString(),
          teacherId: seedData.course.teacherId,
          classGroupId: seedData.classGroup.classGroupId.toString(),
          classroomId: seedData.classroom.classroomId.toString(),
        }),
      );
    }

    // Attendance entity now uses numeric IDs → pass numbers
    await attendanceRepo().save(
      attendanceRepo().create({
        studentId,                   // number
        courseId,                    // number
        slotId: Number(slot.slotId), // number
        date,
        status: 'A',
      }),
    );
  }

  const runMonitor = async (date: string) => {
    const res = await request(app.getHttpServer())
      .post('/notifications/suggestions/absence/run')
      .query({ date })
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .set('Accept', 'application/json');

    console.log('[RUN MONITOR] status', res.status, 'body', res.body);
    return res;
  };

  it('creates suggestion only after three consecutive days', async () => {
    await addAbsence('2025-02-10');
    await addAbsence('2025-02-11');
    await addAbsence('2025-02-12');

    const res = await runMonitor('2025-02-13');
    expect(res.status).toBe(201);

    const { body } = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .expect(200);

    const match = body.data.find((item: { category: string; studentId: number; isActive: boolean }) =>
      item.category === 'attendance-absence-streak' && item.studentId === studentId && item.isActive === true,
    );
    expect(match).toBeTruthy();
  });
});
