import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { seedBasicData } from './helpers/seed';

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

describe('Timetable guards (e2e)', () => {
  let app: INestApplication;
  let coordinatorToken: string;
  let teacherToken: string;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    dataSource = app.get(DataSource);
    const seed = await seedBasicData(dataSource);
    coordinatorToken = await login(app, seed.users.coordinator);
    teacherToken = await login(app, seed.users.teacher);
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires auth for GET /timetable-assignments', () => {
    return request(app.getHttpServer()).get('/timetable-assignments').expect(401);
  });

  it('allows teachers to read timetable assignments', () => {
    return request(app.getHttpServer())
      .get('/timetable-assignments')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);
  });

  it('requires auth for POST /timetable-assignments', () => {
    return request(app.getHttpServer())
      .post('/timetable-assignments')
      .send({ courseId: 1 })
      .expect(401);
  });

  it('prevents teachers from mutating timetable assignments', () => {
    return request(app.getHttpServer())
      .post('/timetable-assignments')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ courseId: 1 })
      .expect(403);
  });

  it('requires auth for GET /timetable-slots', () => {
    return request(app.getHttpServer()).get('/timetable-slots').expect(401);
  });

  it('allows authenticated coordinators to list slots', () => {
    return request(app.getHttpServer())
      .get('/timetable-slots')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .expect(200);
  });
});
