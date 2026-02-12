import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../src/app.module';
import { seedBasicData } from './helpers/seed';
import { TimetableSlot } from '../src/timetable_slots/timetable_slots.entity';
import { TimetableAssignments } from '../src/timetable_assignments/timetable_assignments.entity';
import { Classrooms } from '../src/classrooms/classrooms.entity';


describe('Timetable collisions (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let coordinatorToken: string;
  let slotId: number;
  let courseId: number;
  let classGroupId: number;
  let classroomId: number;
  let teacherId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    const seed = await seedBasicData(dataSource);
    coordinatorToken = await login(seed.users.coordinator);
    teacherId = seed.course.teacherId;
    courseId = Number(seed.course.courseId);
    classGroupId = Number(seed.classGroup.classGroupId);

    const classroomsRepo = dataSource.getRepository(Classrooms);
    const classroom = await classroomsRepo.save(
      classroomsRepo.create({
        name: `Collisions Room ${Date.now()}`,
        building: 'Main',
        capacity: 30,
      }),
    );
    classroomId = Number(classroom.classroomId);

    const slotRepo = dataSource.getRepository(TimetableSlot);
    const assignmentsRepo = dataSource.getRepository(TimetableAssignments);
    const slot = await findAvailableSlot(slotRepo, assignmentsRepo);
    slotId = slot.slotId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows happy path assignment', async () => {
    const res = await createAssignment({
      courseId,
      slotId,
      teacherId,
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
      teacherId,
      classGroupId,
    });

    const res = await createAssignment({
      courseId,
      slotId,
      teacherId,
      classGroupId,
    });

    expect(res.status).toBe(409);
  });

  it('rejects teacher + slot collision', async () => {
    const res = await createAssignment({
      courseId,
      slotId,
      teacherId,
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


  async function findAvailableSlot(
    slotRepo: Repository<TimetableSlot>,
    assignmentsRepo: Repository<TimetableAssignments>,
  ): Promise<TimetableSlot> {
    const dayOfWeek = 1;
    for (let i = 0; i < 10; i++) {
      const hour = 8 + ((Date.now() + i) % 8);
      const startTime = `${String(hour).padStart(2, '0')}:00:00`;
      const endTime = `${String(hour + 1).padStart(2, '0')}:00:00`;
      let slot = await slotRepo.findOne({
        where: { dayOfWeek, startTime, endTime },
      });
      if (!slot) {
        slot = await slotRepo.save(
          slotRepo.create({
            dayOfWeek,
            startTime,
            endTime,
            durationMinutes: 60,
          }),
        );
      }

      const conflictCount = await assignmentsRepo.count({
        where: {
          slotId: slot.slotId.toString(),
          classGroupId: classGroupId.toString(),
        },
      });
      if (conflictCount === 0) {
        return slot;
      }
    }

    throw new Error('Unable to find a free slot for collisions test');
  }

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
