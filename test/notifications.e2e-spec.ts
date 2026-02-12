import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
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

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let coordinatorToken: string;
  let teacherToken: string;

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

  it('rejects unauthenticated access', () => {
    return request(app.getHttpServer()).get('/notifications').expect(401);
  });

  it('prevents teachers from creating notifications', () => {
    return request(app.getHttpServer())
      .post('/notifications')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Unauthorized',
        message: 'Teachers should not create notifications',
        isActive: true,
      })
      .expect(403);
  });

  it('allows coordinators to create and list notifications', async () => {
    const uniqueTitle = `Exam reminder ${Date.now()}`;
    await request(app.getHttpServer())
      .post('/notifications')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({
        title: uniqueTitle,
        message: 'Bring calculator',
        isActive: true,
      })
      .expect(201);

    const { body } = await request(app.getHttpServer())
      .get('/notifications')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .expect(200);

    expect(body).toMatchObject({
      data: expect.any(Array),
      total: expect.any(Number),
    });
    expect(body.data.some((item: { title: string }) => item.title === uniqueTitle)).toBe(true);
  });
});
