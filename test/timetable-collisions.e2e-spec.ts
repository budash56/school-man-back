import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { seedBasicData } from './helpers/seed';
import { TimetableSlot } from '../src/timetable_slots/timetable_slots.entity';
import { Classrooms } from '../src/classrooms/classrooms.entity';

const coordinator = { nationalId: 'coord-001', password: 'Coord#123' };
const teacher = { nationalId: '800001', password: 'Teach#123' };

describe('Timetable collisions (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let coordinatorToken: string;
  let teacherToken: string;
  let slotId: number;
  let courseId: number;
  let classGroupId: number;
  let classroomId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    const seed = await seedBasicData(dataSource);
    coordinatorToken = await login(coordinator);
    teacherToken = await login(teacher);
    courseId = Number(seed.course.courseId);
    classGroupId = Number(seed.classGroup.classGroupId);

    const classroomsRepo = dataSource.getRepository(Classrooms);
    const classroom = await classroomsRepo.save(
      classroomsRepo.create({
        name: 'Collisions Room',
        building: 'Main',
        capacity: 30,
      }),
    );
    classroomId = Number(classroom.classroomId);

    const slotRepo = dataSource.getRepository(TimetableSlot);
    const slot = await slotRepo.save(
      slotRepo.create({
        dayOfWeek: 1,
        startTime: '09:00:00',
        endTime: '10:00:00',
        durationMinutes: 60,
      }),
    );
    slotId = slot.slotId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows happy path assignment', async () => {
    const res = await createAssignment({
      courseId,
      slotId,
      teacherId: teacher.nationalId,
      classGroupId,
      classroomId,
    });

    expect(res.status).toBe(201);
    expect(res.body.assignment).toHaveProperty('assignmentId');
  });

  it('rejects class group + slot collision', async () => {
    await createAssignment({
      courseId,
      slotId,
      teacherId: teacher.nationalId,
      classGroupId,
    });

    const res = await createAssignment({
      courseId,
      slotId,
      teacherId: teacher.nationalId,
      classGroupId,
    });

    expect(res.status).toBe(409);
  });

  it('rejects teacher + slot collision', async () => {
    const res = await createAssignment({
      courseId,
      slotId,
      teacherId: teacher.nationalId,
    });
    expect(res.status).toBe(409);
  });

  it('rejects classroom + slot collision', async () => {
    const res = await createAssignment({
      courseId,
      slotId,
      teacherId: '800002',
      classroomId,
    });
    expect(res.status).toBe(409);
  });

  it('rejects course + slot collision', async () => {
    const res = await createAssignment({
      courseId,
      slotId,
      teacherId: '800003',
    });
    expect(res.status).toBe(409);
  });

  async function login(creds: { nationalId: string; password: string }) {
    const { body } = await request(app.getHttpServer())
      .post('/auth/login')
      .send(creds)
      .expect(201);
    return body.accessToken as string;
  }

  function createAssignment(payload: Record<string, unknown>) {
    return request(app.getHttpServer())
      .post('/timetable-assignments')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        courseId,
        slotId,
        classGroupId,
        ...payload,
      });
  }
});
